import { Context, Data, Effect, Layer, Schema } from 'effect'
import { SqlClient, SqlError } from 'effect/unstable/sql'

import { validateSchemaName } from './migrations.ts'
import type { FoodSourceKind } from './types.ts'

const inputKindSchema = Schema.Literals(['text', 'photo', 'voice'])
const statusSchema = Schema.Literals(['completed', 'failed'])
const sourceKindSchema = Schema.Literals(['raw', 'branded', 'custom', 'recipe'])

const estimateRowSchema = Schema.Struct({
  calories: Schema.Number,
  carbohydrates: Schema.Number,
  created_at: Schema.Date,
  description: Schema.String,
  estimate_id: Schema.String,
  input_description: Schema.String,
  input_kind: inputKindSchema,
  media_content_type: Schema.NullOr(Schema.String),
  media_object_key: Schema.NullOr(Schema.String),
  media_sha256: Schema.NullOr(Schema.String),
  observation_model: Schema.String,
  overall_confidence: Schema.Number,
  profile_id: Schema.String,
  prompt_version: Schema.String,
  protein: Schema.Number,
  resolution_model: Schema.String,
  status: statusSchema,
  total_fat: Schema.Number,
  transcript: Schema.NullOr(Schema.String),
  transcription_model: Schema.NullOr(Schema.String),
  updated_at: Schema.Date,
})

const itemRowSchema = Schema.Struct({
  amount_grams: Schema.Number,
  calories: Schema.Number,
  carbohydrates: Schema.Number,
  confidence: Schema.Number,
  description: Schema.String,
  estimate_id: Schema.String,
  evidence: Schema.String,
  food_id: Schema.NullOr(Schema.String),
  name: Schema.String,
  ordinal: Schema.Number,
  protein: Schema.Number,
  resolved: Schema.Boolean,
  source_kind: Schema.NullOr(sourceKindSchema),
  total_fat: Schema.Number,
})

export type MealEstimateRow = typeof estimateRowSchema.Type
export type MealEstimateItemRow = typeof itemRowSchema.Type

export interface MealEstimateRecord {
  readonly estimate: MealEstimateRow
  readonly items: ReadonlyArray<MealEstimateItemRow>
}

export interface SaveMealEstimateInput {
  readonly calories: number
  readonly carbohydrates: number
  readonly description: string
  readonly estimateId: string
  readonly inputDescription: string
  readonly inputKind: 'text' | 'photo' | 'voice'
  readonly items: ReadonlyArray<{
    readonly amountGrams: number
    readonly calories: number
    readonly carbohydrates: number
    readonly confidence: number
    readonly description: string
    readonly evidence: string
    readonly foodId: string | null
    readonly name: string
    readonly ordinal: number
    readonly protein: number
    readonly resolved: boolean
    readonly sourceKind: FoodSourceKind | null
    readonly totalFat: number
  }>
  readonly mediaContentType: string | null
  readonly mediaObjectKey: string | null
  readonly mediaSha256: string | null
  readonly observationModel: string
  readonly overallConfidence: number
  readonly profileId: string
  readonly promptVersion: string
  readonly protein: number
  readonly resolutionModel: string
  readonly totalFat: number
  readonly transcript: string | null
  readonly transcriptionModel: string | null
}

export class MealEstimateOwnershipError extends Data.TaggedError('MealEstimateOwnershipError')<{
  readonly message: string
}> {}

export class MealEstimateInvariantError extends Data.TaggedError('MealEstimateInvariantError')<{
  readonly message: string
}> {}

export type MealEstimateRepositoryError =
  | SqlError.SqlError
  | Schema.SchemaError
  | MealEstimateOwnershipError
  | MealEstimateInvariantError

export interface MealEstimateRepositoryService {
  readonly delete: (
    profileId: string,
    estimateId: string,
  ) => Effect.Effect<MealEstimateRecord | undefined, MealEstimateRepositoryError>
  readonly findById: (
    profileId: string,
    estimateId: string,
  ) => Effect.Effect<MealEstimateRecord | undefined, MealEstimateRepositoryError>
  readonly save: (
    input: SaveMealEstimateInput,
  ) => Effect.Effect<MealEstimateRecord, MealEstimateRepositoryError>
}

export const MealEstimateRepository = Context.Service<MealEstimateRepositoryService>(
  '@mons/database/MealEstimateRepository',
)

export const makeMealEstimateRepository = (
  options: { readonly appSchema?: string; readonly now?: () => Date } = {},
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const schema = yield* validateSchemaName(options.appSchema ?? 'mons_app')
    const now = options.now ?? (() => new Date())
    const estimates = sql(`${schema}.meal_estimates`)
    const items = sql(`${schema}.meal_estimate_items`)
    const cleanupJobs = sql(`${schema}.meal_media_cleanup_jobs`)
    const decodeEstimates = Schema.decodeUnknownEffect(Schema.Array(estimateRowSchema))
    const decodeItems = Schema.decodeUnknownEffect(Schema.Array(itemRowSchema))

    const findById = Effect.fn('MealEstimateRepository.findById')(function* (
      profileId: string,
      estimateId: string,
    ) {
      const estimateRows = yield* decodeEstimates(
        yield* sql`SELECT * FROM ${estimates}
          WHERE profile_id = ${profileId} AND estimate_id = ${estimateId}`,
      )
      const estimate = estimateRows[0]
      if (estimate === undefined) return undefined
      const itemRows = yield* decodeItems(
        yield* sql`SELECT * FROM ${items}
          WHERE estimate_id = ${estimateId} ORDER BY ordinal`,
      )
      return { estimate, items: itemRows }
    })

    const remove = Effect.fn('MealEstimateRepository.delete')(function* (
      profileId: string,
      estimateId: string,
    ) {
      return yield* sql.withTransaction(
        Effect.gen(function* () {
          const found = yield* findById(profileId, estimateId)
          if (found === undefined) return undefined
          yield* sql`DELETE FROM ${estimates}
            WHERE profile_id = ${profileId} AND estimate_id = ${estimateId}`
          if (found.estimate.media_object_key !== null) {
            yield* sql`INSERT INTO ${cleanupJobs} (object_key, not_before)
              VALUES (${found.estimate.media_object_key}, ${now()})
              ON CONFLICT (object_key) DO UPDATE SET not_before = EXCLUDED.not_before`
          }
          return found
        }),
      )
    })

    const save = Effect.fn('MealEstimateRepository.save')(function* (input: SaveMealEstimateInput) {
      yield* sql.withTransaction(
        Effect.gen(function* () {
          const owners = yield* sql<{ readonly belongs_to_profile: boolean }>`
            SELECT profile_id = ${input.profileId} AS belongs_to_profile
            FROM ${estimates} WHERE estimate_id = ${input.estimateId}
          `
          if (owners[0] !== undefined && !owners[0].belongs_to_profile)
            return yield* new MealEstimateOwnershipError({
              message: 'Meal estimate does not belong to this profile',
            })
          yield* sql`INSERT INTO ${estimates} (
            estimate_id, profile_id, input_kind, status, input_description, transcript,
            media_object_key, media_content_type, media_sha256, observation_model,
            resolution_model, transcription_model, prompt_version, description,
            overall_confidence, calories, protein, carbohydrates, total_fat
          ) VALUES (
            ${input.estimateId}, ${input.profileId}, ${input.inputKind}, 'completed',
            ${input.inputDescription}, ${input.transcript}, ${input.mediaObjectKey},
            ${input.mediaContentType}, ${input.mediaSha256}, ${input.observationModel},
            ${input.resolutionModel}, ${input.transcriptionModel}, ${input.promptVersion},
            ${input.description}, ${input.overallConfidence}, ${input.calories},
            ${input.protein}, ${input.carbohydrates}, ${input.totalFat}
          ) ON CONFLICT (estimate_id) DO UPDATE SET
            input_kind = EXCLUDED.input_kind,
            status = EXCLUDED.status,
            input_description = EXCLUDED.input_description,
            transcript = EXCLUDED.transcript,
            media_object_key = EXCLUDED.media_object_key,
            media_content_type = EXCLUDED.media_content_type,
            media_sha256 = EXCLUDED.media_sha256,
            observation_model = EXCLUDED.observation_model,
            resolution_model = EXCLUDED.resolution_model,
            transcription_model = EXCLUDED.transcription_model,
            prompt_version = EXCLUDED.prompt_version,
            description = EXCLUDED.description,
            overall_confidence = EXCLUDED.overall_confidence,
            calories = EXCLUDED.calories,
            protein = EXCLUDED.protein,
            carbohydrates = EXCLUDED.carbohydrates,
            total_fat = EXCLUDED.total_fat,
            updated_at = ${now()}`
          yield* sql`DELETE FROM ${items} WHERE estimate_id = ${input.estimateId}`
          if (input.items.length > 0)
            yield* sql`INSERT INTO ${items} ${sql.insert(
              input.items.map((item) => ({
                amount_grams: item.amountGrams,
                calories: item.calories,
                carbohydrates: item.carbohydrates,
                confidence: item.confidence,
                description: item.description,
                estimate_id: input.estimateId,
                evidence: item.evidence,
                food_id: item.foodId,
                name: item.name,
                ordinal: item.ordinal,
                protein: item.protein,
                resolved: item.resolved,
                source_kind: item.sourceKind,
                total_fat: item.totalFat,
              })),
            )}`
        }),
      )
      const saved = yield* findById(input.profileId, input.estimateId)
      if (saved === undefined)
        return yield* new MealEstimateInvariantError({
          message: 'Saved meal estimate could not be loaded',
        })
      return saved
    })

    return MealEstimateRepository.of({ delete: remove, findById, save })
  })

export const mealEstimateRepositoryLayer = (
  options: { readonly appSchema?: string; readonly now?: () => Date } = {},
) => Layer.effect(MealEstimateRepository, makeMealEstimateRepository(options))
