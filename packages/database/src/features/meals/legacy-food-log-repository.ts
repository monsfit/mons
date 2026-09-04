import { Context, Effect, Layer, Schema } from 'effect'
import { SqlClient } from 'effect/unstable/sql'

import { type RepositoryError, decodeRequiredRow, decodeRows } from '../../core/repository.ts'
import { validateSchemaName } from '../../migrations.ts'
import type { FoodSourceKind, MealCategory } from '../../types.ts'

const foodLogEntryRecordSchema = Schema.Struct({
  brand: Schema.NullOr(Schema.String),
  calories_per_100g: Schema.NullOr(Schema.Number),
  carbohydrates_per_100g: Schema.NullOr(Schema.Number),
  created_at: Schema.Date,
  dataset_kind: Schema.Literals(['raw', 'branded', 'restaurant', 'custom', 'recipe']),
  entry_id: Schema.String,
  fat_per_100g: Schema.NullOr(Schema.Number),
  food_id: Schema.String,
  gtin: Schema.NullOr(Schema.String),
  logged_at: Schema.Date,
  meal_category: Schema.Literals(['breakfast', 'lunch', 'dinner', 'snack']),
  meal_id: Schema.String,
  name: Schema.String,
  profile_id: Schema.String,
  protein_per_100g: Schema.NullOr(Schema.Number),
  quantity_grams: Schema.Number,
})

const foodSourceRecordSchema = Schema.Struct({
  brand: Schema.NullOr(Schema.String),
  calories: Schema.NullOr(Schema.Number),
  carbohydrates_total: Schema.NullOr(Schema.Number),
  dataset_kind: Schema.Literals(['raw', 'branded', 'restaurant', 'custom', 'recipe']),
  food_id: Schema.String,
  gtin: Schema.NullOr(Schema.String),
  name: Schema.String,
  protein: Schema.NullOr(Schema.Number),
  total_fat: Schema.NullOr(Schema.Number),
})

export type FoodLogEntryRecord = typeof foodLogEntryRecordSchema.Type

export interface CreateFoodLogEntryInput {
  readonly datasetKind: FoodSourceKind
  readonly entryId: string
  readonly foodId: string
  readonly loggedAt: Date
  readonly mealCategory: MealCategory
  readonly quantityGrams: number
}

export interface LegacyFoodLogRepositoryService {
  readonly delete: (profileId: string, entryId: string) => Effect.Effect<boolean, RepositoryError>
  readonly list: (
    profileId: string,
    from: Date,
    to: Date,
  ) => Effect.Effect<ReadonlyArray<FoodLogEntryRecord>, RepositoryError>
  readonly save: (
    profileId: string,
    input: CreateFoodLogEntryInput,
  ) => Effect.Effect<FoodLogEntryRecord | undefined, RepositoryError>
}

export const LegacyFoodLogRepository = Context.Service<LegacyFoodLogRepositoryService>(
  '@mons/database/LegacyFoodLogRepository',
)

export const makeLegacyFoodLogRepository = (
  options: {
    readonly appSchema?: string
    readonly catalogSchema?: string
    readonly now?: () => Date
  } = {},
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const appSchema = yield* validateSchemaName(options.appSchema ?? 'mons_app')
    const catalogSchema = yield* validateSchemaName(options.catalogSchema ?? 'mons_catalog')
    const now = options.now ?? (() => new Date())
    const profiles = sql(`${appSchema}.profiles`)
    const foodLogEntries = sql(`${appSchema}.food_log_entries`)
    const mealLogs = sql(`${appSchema}.meal_logs`)
    const customFoods = sql(`${appSchema}.custom_foods`)
    const recipes = sql(`${appSchema}.recipes`)
    const foods = sql(`${catalogSchema}.foods`)

    const save = Effect.fn('LegacyFoodLogRepository.save')(function* (
      profileId: string,
      input: CreateFoodLogEntryInput,
    ) {
      return yield* sql.withTransaction(
        Effect.gen(function* () {
          yield* sql`INSERT INTO ${profiles} (profile_id, clerk_user_id)
            VALUES (${profileId}, NULL)
            ON CONFLICT (profile_id) DO UPDATE SET updated_at = ${now()}`
          const foodRows =
            input.datasetKind === 'custom'
              ? yield* sql`SELECT brand, calories_per_100g AS calories,
                    carbohydrates_per_100g AS carbohydrates_total, 'custom' AS dataset_kind,
                    food_id::text AS food_id, barcode AS gtin, name,
                    protein_per_100g AS protein, fat_per_100g AS total_fat
                  FROM ${customFoods}
                  WHERE profile_id = ${profileId} AND food_id = ${input.foodId}
                  LIMIT 1`
              : input.datasetKind === 'recipe'
                ? yield* sql`SELECT NULL::text AS brand, calories_per_100g AS calories,
                      carbohydrates_per_100g AS carbohydrates_total, 'recipe' AS dataset_kind,
                      recipe_id::text AS food_id, NULL::text AS gtin, name,
                      protein_per_100g AS protein, fat_per_100g AS total_fat
                    FROM ${recipes}
                    WHERE profile_id = ${profileId} AND recipe_id = ${input.foodId}
                    LIMIT 1`
                : yield* sql`SELECT brand,
                      CASE WHEN dataset_kind = 'restaurant' THEN calories * 100 / nutrient_basis_amount ELSE calories END AS calories,
                      CASE WHEN dataset_kind = 'restaurant' THEN coalesce(carbohydrates_total, carbohydrates_available) * 100 / nutrient_basis_amount ELSE coalesce(carbohydrates_total, carbohydrates_available) END AS carbohydrates_total,
                      dataset_kind, food_id, gtin, name,
                      CASE WHEN dataset_kind = 'restaurant' THEN protein * 100 / nutrient_basis_amount ELSE protein END AS protein,
                      CASE WHEN dataset_kind = 'restaurant' THEN total_fat * 100 / nutrient_basis_amount ELSE total_fat END AS total_fat
                    FROM ${foods}
                    WHERE dataset_kind = ${input.datasetKind} AND food_id = ${input.foodId}
                    LIMIT 1`
          const food = (yield* decodeRows(foodSourceRecordSchema, foodRows))[0]
          if (food === undefined) return undefined
          yield* sql`INSERT INTO ${mealLogs} (
                meal_id, profile_id, description, meal_category, logged_at
              ) VALUES (
                ${input.entryId}, ${profileId}, ${food.name}, ${input.mealCategory}, ${input.loggedAt}
              ) ON CONFLICT (meal_id) DO UPDATE SET
                meal_category = ${input.mealCategory}, logged_at = ${input.loggedAt}, updated_at = ${now()}`
          const rows = yield* sql`INSERT INTO ${foodLogEntries} (
                entry_id, meal_id, profile_id, dataset_kind, food_id, name, brand, gtin,
                quantity_grams, meal_category, logged_at, calories_per_100g,
                protein_per_100g, carbohydrates_per_100g, fat_per_100g
              ) VALUES (
                ${input.entryId}, ${input.entryId}, ${profileId}, ${food.dataset_kind}, ${food.food_id}, ${food.name},
                ${food.brand}, ${food.gtin}, ${input.quantityGrams}, ${input.mealCategory},
                ${input.loggedAt}, ${food.calories}, ${food.protein}, ${food.carbohydrates_total},
                ${food.total_fat}
              ) ON CONFLICT (entry_id) DO UPDATE SET
                logged_at = ${input.loggedAt}, meal_category = ${input.mealCategory},
                quantity_grams = ${input.quantityGrams}
              RETURNING *`
          return yield* decodeRequiredRow(
            foodLogEntryRecordSchema,
            rows,
            'Food log upsert returned no row',
          )
        }),
      )
    })

    const list = Effect.fn('LegacyFoodLogRepository.list')(function* (
      profileId: string,
      from: Date,
      to: Date,
    ) {
      const rows = yield* sql`SELECT * FROM ${foodLogEntries}
        WHERE profile_id = ${profileId} AND logged_at >= ${from} AND logged_at < ${to}
        ORDER BY logged_at ASC, entry_id ASC`
      return yield* decodeRows(foodLogEntryRecordSchema, rows)
    })

    const deleteEntry = Effect.fn('LegacyFoodLogRepository.delete')(function* (
      profileId: string,
      entryId: string,
    ) {
      return yield* sql.withTransaction(
        Effect.gen(function* () {
          const rows = yield* sql<{ readonly meal_id: string }>`DELETE FROM ${foodLogEntries}
            WHERE profile_id = ${profileId} AND entry_id = ${entryId} RETURNING meal_id`
          const mealId = rows[0]?.meal_id
          if (mealId !== undefined)
            yield* sql`DELETE FROM ${mealLogs}
              WHERE profile_id = ${profileId} AND meal_id = ${mealId}
                AND NOT EXISTS (SELECT 1 FROM ${foodLogEntries} WHERE meal_id = ${mealId})`
          return mealId !== undefined
        }),
      )
    })

    return LegacyFoodLogRepository.of({ delete: deleteEntry, list, save })
  })

export const legacyFoodLogRepositoryLayer = (
  options: {
    readonly appSchema?: string
    readonly catalogSchema?: string
    readonly now?: () => Date
  } = {},
) => Layer.effect(LegacyFoodLogRepository, makeLegacyFoodLogRepository(options))
