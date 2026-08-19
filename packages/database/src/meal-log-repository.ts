import { Context, Effect, Layer, Schema } from 'effect'
import { SqlClient, SqlError } from 'effect/unstable/sql'

import { validateSchemaName } from './migrations.ts'
import type { FoodSourceKind, MealCategory } from './types.ts'

const sourceKindSchema = Schema.Literals(['raw', 'branded', 'custom', 'recipe'])
const mealCategorySchema = Schema.Literals(['breakfast', 'lunch', 'dinner', 'snack'])
const inputKindSchema = Schema.Literals(['text', 'photo', 'voice'])

const mealLogRowSchema = Schema.Struct({
  created_at: Schema.Date,
  description: Schema.String,
  estimate_id: Schema.NullOr(Schema.String),
  input_kind: Schema.NullOr(inputKindSchema),
  logged_at: Schema.Date,
  meal_category: mealCategorySchema,
  meal_id: Schema.String,
  media_content_type: Schema.NullOr(Schema.String),
  media_object_key: Schema.NullOr(Schema.String),
  profile_id: Schema.String,
  updated_at: Schema.Date,
})

const mealLogEntryRowSchema = Schema.Struct({
  brand: Schema.NullOr(Schema.String),
  calories_per_100g: Schema.NullOr(Schema.Number),
  carbohydrates_per_100g: Schema.NullOr(Schema.Number),
  created_at: Schema.Date,
  dataset_kind: sourceKindSchema,
  entry_id: Schema.String,
  fat_per_100g: Schema.NullOr(Schema.Number),
  food_id: Schema.String,
  gtin: Schema.NullOr(Schema.String),
  logged_at: Schema.Date,
  meal_category: mealCategorySchema,
  meal_id: Schema.String,
  name: Schema.String,
  profile_id: Schema.String,
  protein_per_100g: Schema.NullOr(Schema.Number),
  quantity_grams: Schema.Number,
})

const foodSnapshotSchema = Schema.Struct({
  brand: Schema.NullOr(Schema.String),
  calories: Schema.NullOr(Schema.Number),
  carbohydrates: Schema.NullOr(Schema.Number),
  dataset_kind: sourceKindSchema,
  food_id: Schema.String,
  gtin: Schema.NullOr(Schema.String),
  name: Schema.String,
  protein: Schema.NullOr(Schema.Number),
  total_fat: Schema.NullOr(Schema.Number),
})
type FoodSnapshot = typeof foodSnapshotSchema.Type

export type MealLogRow = typeof mealLogRowSchema.Type
export type MealLogEntryRow = typeof mealLogEntryRowSchema.Type

export interface MealLogRecord {
  readonly meal: MealLogRow
  readonly items: ReadonlyArray<MealLogEntryRow>
}

export interface MealLogItemInput {
  readonly datasetKind: FoodSourceKind
  readonly entryId: string
  readonly foodId: string
  readonly quantityGrams: number
}

export interface SaveMealLogInput {
  readonly description: string
  readonly estimateId: string | null
  readonly items: ReadonlyArray<MealLogItemInput>
  readonly loggedAt: Date
  readonly mealCategory: MealCategory
  readonly mealId: string
  readonly media?: {
    readonly contentType: string
    readonly objectKey: string
    readonly sha256: string
  }
}

export class MealLogNotFoundError extends Schema.TaggedErrorClass<MealLogNotFoundError>()(
  'MealLogNotFoundError',
  { message: Schema.String },
) {}

export class MealLogOwnershipError extends Schema.TaggedErrorClass<MealLogOwnershipError>()(
  'MealLogOwnershipError',
  { message: Schema.String },
) {}

export class MealLogInvariantError extends Schema.TaggedErrorClass<MealLogInvariantError>()(
  'MealLogInvariantError',
  { message: Schema.String },
) {}

export type MealLogRepositoryError =
  | SqlError.SqlError
  | Schema.SchemaError
  | MealLogNotFoundError
  | MealLogOwnershipError
  | MealLogInvariantError

export interface MealLogRepositoryService {
  readonly completeMediaCleanup: (objectKey: string) => Effect.Effect<void, SqlError.SqlError>
  readonly delete: (
    profileId: string,
    mealId: string,
  ) => Effect.Effect<MealLogRecord | undefined, MealLogRepositoryError>
  readonly findById: (
    profileId: string,
    mealId: string,
  ) => Effect.Effect<MealLogRecord | undefined, MealLogRepositoryError>
  readonly enqueueMediaCleanup: (
    objectKey: string,
    notBefore: Date,
  ) => Effect.Effect<void, SqlError.SqlError>
  readonly listMediaCleanup: (
    limit: number,
  ) => Effect.Effect<ReadonlyArray<string>, SqlError.SqlError>
  readonly list: (
    profileId: string,
    from: Date,
    to: Date,
  ) => Effect.Effect<ReadonlyArray<MealLogRecord>, MealLogRepositoryError>
  readonly save: (
    profileId: string,
    input: SaveMealLogInput,
  ) => Effect.Effect<MealLogRecord, MealLogRepositoryError>
}

export const MealLogRepository = Context.Service<MealLogRepositoryService>(
  '@regolith/database/MealLogRepository',
)

export const makeMealLogRepository = (
  options: {
    readonly appSchema?: string
    readonly catalogSchema?: string
    readonly now?: () => Date
  } = {},
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const appSchema = yield* validateSchemaName(options.appSchema ?? 'regolith_app')
    const catalogSchema = yield* validateSchemaName(options.catalogSchema ?? 'regolith')
    const now = options.now ?? (() => new Date())
    const meals = sql(`${appSchema}.meal_logs`)
    const entries = sql(`${appSchema}.food_log_entries`)
    const estimates = sql(`${appSchema}.meal_estimates`)
    const cleanupJobs = sql(`${appSchema}.meal_media_cleanup_jobs`)
    const profiles = sql(`${appSchema}.profiles`)
    const customFoods = sql(`${appSchema}.custom_foods`)
    const recipes = sql(`${appSchema}.recipes`)
    const foods = sql(`${catalogSchema}.foods`)
    const decodeMeals = Schema.decodeUnknownEffect(Schema.Array(mealLogRowSchema))
    const decodeEntries = Schema.decodeUnknownEffect(Schema.Array(mealLogEntryRowSchema))
    const decodeFoods = Schema.decodeUnknownEffect(Schema.Array(foodSnapshotSchema))

    const records = Effect.fn('MealLogRepository.records')(function* (
      mealRows: ReadonlyArray<MealLogRow>,
    ) {
      if (mealRows.length === 0) return []
      const entryRows = yield* decodeEntries(
        yield* sql`SELECT * FROM ${entries}
          WHERE ${sql.in(
            'meal_id',
            mealRows.map((meal) => meal.meal_id),
          )}
          ORDER BY logged_at, created_at, entry_id`,
      )
      const entriesByMeal = Map.groupBy(entryRows, (entry) => entry.meal_id)
      return mealRows.map((meal) => ({ meal, items: entriesByMeal.get(meal.meal_id) ?? [] }))
    })

    const selectMeals = (
      where: 'id' | 'range',
      profileId: string,
      first: string | Date,
      to?: Date,
    ) =>
      where === 'id'
        ? sql`SELECT m.*, e.input_kind, e.media_object_key, e.media_content_type
            FROM ${meals} m LEFT JOIN ${estimates} e ON e.estimate_id = m.estimate_id
            WHERE m.profile_id = ${profileId} AND m.meal_id = ${first}`
        : sql`SELECT m.*, e.input_kind, e.media_object_key, e.media_content_type
            FROM ${meals} m LEFT JOIN ${estimates} e ON e.estimate_id = m.estimate_id
            WHERE m.profile_id = ${profileId} AND m.logged_at >= ${first} AND m.logged_at < ${to}
            ORDER BY m.logged_at, m.meal_id`

    const findById = Effect.fn('MealLogRepository.findById')(function* (
      profileId: string,
      mealId: string,
    ) {
      const mealRows = yield* decodeMeals(yield* selectMeals('id', profileId, mealId))
      return (yield* records(mealRows))[0]
    })

    const resolveFood = Effect.fn('MealLogRepository.resolveFood')(function* (
      profileId: string,
      item: MealLogItemInput,
    ) {
      const rows =
        item.datasetKind === 'custom'
          ? yield* sql`SELECT brand, calories_per_100g AS calories,
                carbohydrates_per_100g AS carbohydrates, 'custom' AS dataset_kind,
                food_id::text AS food_id, barcode AS gtin, name,
                protein_per_100g AS protein, fat_per_100g AS total_fat
              FROM ${customFoods}
              WHERE profile_id = ${profileId} AND food_id = ${item.foodId} LIMIT 1`
          : item.datasetKind === 'recipe'
            ? yield* sql`SELECT NULL::text AS brand, calories_per_100g AS calories,
                  carbohydrates_per_100g AS carbohydrates, 'recipe' AS dataset_kind,
                  recipe_id::text AS food_id, NULL::text AS gtin, name,
                  protein_per_100g AS protein, fat_per_100g AS total_fat
                FROM ${recipes}
                WHERE profile_id = ${profileId} AND recipe_id = ${item.foodId} LIMIT 1`
            : yield* sql`SELECT brand, calories,
                  coalesce(carbohydrates_total, carbohydrates_available) AS carbohydrates,
                  dataset_kind, food_id, gtin, name, protein, total_fat
                FROM ${foods}
                WHERE dataset_kind = ${item.datasetKind} AND food_id = ${item.foodId} LIMIT 1`
      const food = (yield* decodeFoods(rows))[0]
      if (food === undefined)
        return yield* MealLogNotFoundError.make({ message: `Food ${item.foodId} was not found` })
      return food
    })

    const save = Effect.fn('MealLogRepository.save')(function* (
      profileId: string,
      input: SaveMealLogInput,
    ) {
      yield* sql.withTransaction(
        Effect.gen(function* () {
          yield* sql`INSERT INTO ${profiles} (profile_id) VALUES (${profileId})
            ON CONFLICT (profile_id) DO UPDATE SET updated_at = ${now()}`
          const ownerRows = yield* sql<{ readonly belongs_to_profile: boolean }>`
            SELECT profile_id = ${profileId} AS belongs_to_profile
            FROM ${meals} WHERE meal_id = ${input.mealId}
          `
          if (ownerRows[0] !== undefined && !ownerRows[0].belongs_to_profile)
            return yield* MealLogOwnershipError.make({
              message: 'Meal does not belong to this profile',
            })
          if (input.estimateId !== null) {
            const estimateRows = yield* sql<{ readonly belongs_to_profile: boolean }>`
              SELECT profile_id = ${profileId} AS belongs_to_profile
              FROM ${estimates} WHERE estimate_id = ${input.estimateId}
            `
            if (estimateRows[0]?.belongs_to_profile !== true)
              return yield* MealLogOwnershipError.make({
                message: 'Estimate does not belong to this profile',
              })
          }
          const resolved: Array<{ readonly food: FoodSnapshot; readonly item: MealLogItemInput }> =
            []
          for (const item of input.items)
            resolved.push({ food: yield* resolveFood(profileId, item), item })
          yield* sql`INSERT INTO ${meals} (
              meal_id, profile_id, estimate_id, description, meal_category, logged_at
            ) VALUES (
              ${input.mealId}, ${profileId}, ${input.estimateId}, ${input.description},
              ${input.mealCategory}, ${input.loggedAt}
            ) ON CONFLICT (meal_id) DO UPDATE SET
              estimate_id = EXCLUDED.estimate_id, description = EXCLUDED.description,
              meal_category = EXCLUDED.meal_category, logged_at = EXCLUDED.logged_at,
              updated_at = ${now()}`
          yield* sql`DELETE FROM ${entries} WHERE meal_id = ${input.mealId}`
          yield* sql`INSERT INTO ${entries} ${sql.insert(
            resolved.map(({ food, item }) => ({
              brand: food.brand,
              calories_per_100g: food.calories,
              carbohydrates_per_100g: food.carbohydrates,
              dataset_kind: food.dataset_kind,
              entry_id: item.entryId,
              fat_per_100g: food.total_fat,
              food_id: food.food_id,
              gtin: food.gtin,
              logged_at: input.loggedAt,
              meal_category: input.mealCategory,
              meal_id: input.mealId,
              name: food.name,
              profile_id: profileId,
              protein_per_100g: food.protein,
              quantity_grams: item.quantityGrams,
            })),
          )}`
          if (input.media !== undefined && input.estimateId !== null) {
            const attached = yield* sql<{ readonly estimate_id: string }>`UPDATE ${estimates} SET
              media_content_type = ${input.media.contentType},
              media_object_key = ${input.media.objectKey},
              media_sha256 = ${input.media.sha256},
              updated_at = ${now()}
              WHERE profile_id = ${profileId} AND estimate_id = ${input.estimateId}
              RETURNING estimate_id`
            if (attached[0] === undefined)
              return yield* MealLogInvariantError.make({
                message: 'Meal photo metadata could not be attached',
              })
            yield* sql`DELETE FROM ${cleanupJobs} WHERE object_key = ${input.media.objectKey}`
          }
        }),
      )
      const saved = yield* findById(profileId, input.mealId)
      if (saved === undefined)
        return yield* MealLogInvariantError.make({ message: 'Saved meal could not be loaded' })
      return saved
    })

    const list = Effect.fn('MealLogRepository.list')(function* (
      profileId: string,
      from: Date,
      to: Date,
    ) {
      const mealRows = yield* decodeMeals(yield* selectMeals('range', profileId, from, to))
      return yield* records(mealRows)
    })

    const remove = Effect.fn('MealLogRepository.delete')(function* (
      profileId: string,
      mealId: string,
    ) {
      return yield* sql.withTransaction(
        Effect.gen(function* () {
          const found = yield* findById(profileId, mealId)
          if (found === undefined) return undefined
          yield* sql`DELETE FROM ${meals} WHERE profile_id = ${profileId} AND meal_id = ${mealId}`
          if (found.meal.estimate_id !== null) {
            yield* sql`DELETE FROM ${estimates}
              WHERE profile_id = ${profileId} AND estimate_id = ${found.meal.estimate_id}`
          }
          if (found.meal.media_object_key !== null) {
            yield* sql`INSERT INTO ${cleanupJobs} (object_key, not_before)
              VALUES (${found.meal.media_object_key}, ${now()})
              ON CONFLICT (object_key) DO UPDATE SET not_before = EXCLUDED.not_before`
          }
          return found
        }),
      )
    })

    const enqueueMediaCleanup = Effect.fn('MealLogRepository.enqueueMediaCleanup')(function* (
      objectKey: string,
      notBefore: Date,
    ) {
      yield* sql`INSERT INTO ${cleanupJobs} (object_key, not_before)
        VALUES (${objectKey}, ${notBefore})
        ON CONFLICT (object_key) DO UPDATE SET not_before = EXCLUDED.not_before`
    })

    const listMediaCleanup = Effect.fn('MealLogRepository.listMediaCleanup')(function* (
      limit: number,
    ) {
      const rows = yield* sql<{ readonly object_key: string }>`SELECT object_key
        FROM ${cleanupJobs}
        WHERE not_before <= ${now()}
        ORDER BY not_before, object_key
        LIMIT ${limit}`
      return rows.map((row) => row.object_key)
    })

    const completeMediaCleanup = Effect.fn('MealLogRepository.completeMediaCleanup')(function* (
      objectKey: string,
    ) {
      yield* sql`DELETE FROM ${cleanupJobs} WHERE object_key = ${objectKey}`
    })

    return MealLogRepository.of({
      completeMediaCleanup,
      delete: remove,
      enqueueMediaCleanup,
      findById,
      list,
      listMediaCleanup,
      save,
    })
  })

export const mealLogRepositoryLayer = (
  options: {
    readonly appSchema?: string
    readonly catalogSchema?: string
    readonly now?: () => Date
  } = {},
) => Layer.effect(MealLogRepository, makeMealLogRepository(options))
