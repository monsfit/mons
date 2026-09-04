import type { MonsApi } from '../api.ts'
import { Authentication, CurrentIdentity } from '../core/auth.ts'
import {
  ForbiddenError,
  InternalApiError,
  NotFoundError,
  RequestValidation,
  ServiceUnavailableError,
  UnauthorizedError,
  ValidationError,
  forbiddenError,
  internalApiError,
  serviceUnavailableError,
  validationError,
} from '../core/errors.ts'
import { fromProfileService } from '../core/handler-errors.ts'
import {
  type ProfileAccessDenied,
  type ServicePersistenceError,
  fromRepository,
} from '../core/service-errors.ts'
import {
  type R2ObjectNotFound,
  type R2OperationError,
  R2Storage,
} from '../infrastructure/storage/r2-storage.ts'
import { ProfileAccessService } from './profile.ts'
import {
  type CreateMealEstimate,
  type FoodLogEntry,
  type FoodSourceKind,
  type MealEstimate,
  type MealEstimateItem,
  type MealLog,
  type SaveMealLog,
  createFoodLogEntrySchema,
  createMealEstimateSchema,
  foodLogEntryPathSchema,
  foodLogEntrySchema,
  foodLogResponseSchema,
  mealDescriptionRequestSchema,
  mealDescriptionResponseSchema,
  mealEstimatePathSchema,
  mealEstimateSchema,
  mealLogPathSchema,
  mealLogResponseSchema,
  mealLogSchema,
  mealPhotoResponseSchema,
  profilePathSchema,
  saveMealLogSchema,
  timeRangeQuerySchema,
} from '@mons/contracts'
import {
  CatalogReader,
  type CustomFoodRecord,
  type FoodLogEntryRecord,
  type FoodSearchRecord,
  LegacyFoodLogRepository,
  LibraryRepository,
  type MealEstimateRecord,
  MealEstimateRepository,
  type MealEstimateRepositoryError,
  type MealLogRecord,
  MealLogRepository,
  type MealLogRepositoryError,
  type RecipeRecord,
} from '@mons/database'
import {
  type LanguageModel,
  NoObjectGeneratedError,
  Output,
  generateText,
  stepCountIs,
  tool,
} from 'ai'
import { Clock, Config, Context, Effect, Layer, Match, Schedule, Schema } from 'effect'
import {
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from 'effect/unstable/httpapi'
import { createHash } from 'node:crypto'

const profileErrors = [
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  NotFoundError,
  ServiceUnavailableError,
  InternalApiError,
]
const createdFoodLogEntrySchema = foodLogEntrySchema.pipe(HttpApiSchema.status(201))
const createdMealEstimateSchema = mealEstimateSchema.pipe(HttpApiSchema.status(201))
const createdMealLogSchema = mealLogSchema.pipe(HttpApiSchema.status(201))

export const mealsApi = HttpApiGroup.make('meals')
  .add(
    HttpApiEndpoint.get('listFoodLog', '/v1/profiles/:profileId/food-log', {
      params: profilePathSchema,
      query: timeRangeQuerySchema,
      success: foodLogResponseSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.post('saveFoodLogEntry', '/v1/profiles/:profileId/food-log', {
      params: profilePathSchema,
      payload: createFoodLogEntrySchema,
      success: createdFoodLogEntrySchema,
      error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
    }),
    HttpApiEndpoint.delete('deleteFoodLogEntry', '/v1/profiles/:profileId/food-log/:entryId', {
      params: foodLogEntryPathSchema,
      error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
    }),
    HttpApiEndpoint.get('listMealLogs', '/v1/profiles/:profileId/meal-logs', {
      params: profilePathSchema,
      query: timeRangeQuerySchema,
      success: mealLogResponseSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.post('saveMealLog', '/v1/profiles/:profileId/meal-logs', {
      params: profilePathSchema,
      payload: saveMealLogSchema,
      success: createdMealLogSchema,
      error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
    }),
    HttpApiEndpoint.put('updateMealLog', '/v1/profiles/:profileId/meal-logs/:mealId', {
      params: mealLogPathSchema,
      payload: saveMealLogSchema,
      success: mealLogSchema,
      error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
    }),
    HttpApiEndpoint.delete('deleteMealLog', '/v1/profiles/:profileId/meal-logs/:mealId', {
      params: mealLogPathSchema,
      error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
    }),
    HttpApiEndpoint.get('getMealPhoto', '/v1/profiles/:profileId/meal-logs/:mealId/photo', {
      params: mealLogPathSchema,
      success: mealPhotoResponseSchema,
      error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
    }),
    HttpApiEndpoint.post('describeMeal', '/v1/profiles/:profileId/meal-descriptions', {
      params: profilePathSchema,
      payload: mealDescriptionRequestSchema,
      success: mealDescriptionResponseSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.post('createMealEstimate', '/v1/profiles/:profileId/meal-estimates', {
      params: profilePathSchema,
      payload: createMealEstimateSchema,
      success: createdMealEstimateSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.get('getMealEstimate', '/v1/profiles/:profileId/meal-estimates/:estimateId', {
      params: mealEstimatePathSchema,
      success: mealEstimateSchema,
      error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
    }),
    HttpApiEndpoint.delete(
      'discardMealEstimate',
      '/v1/profiles/:profileId/meal-estimates/:estimateId',
      {
        params: mealEstimatePathSchema,
        error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
      },
    ),
  )
  .middleware(RequestValidation)
  .middleware(Authentication)

export class InvalidMealMedia extends Schema.TaggedErrorClass<InvalidMealMedia>()(
  'InvalidMealMedia',
  {
    message: Schema.String,
  },
) {}

export class MealEstimationError extends Schema.TaggedErrorClass<MealEstimationError>()(
  'MealEstimationError',
  {
    cause: Schema.Defect(),
    operation: Schema.Literals(['analyze', 'load', 'persist']),
  },
) {}

export type MealEstimationOperationError =
  | InvalidMealMedia
  | MealEstimationError
  | MealIntelligenceError

export interface MealEstimationService {
  readonly create: (
    profileId: string,
    input: CreateMealEstimate,
  ) => Effect.Effect<MealEstimate, MealEstimationOperationError>
  readonly findById: (
    profileId: string,
    estimateId: string,
  ) => Effect.Effect<MealEstimate | undefined, MealEstimationError>
}

export class MealEstimation extends Context.Service<MealEstimation, MealEstimationService>()(
  '@mons/api/MealEstimation',
) {}

const decodeMealMediaBase64 = Effect.fn('MealEstimation.decodeBase64')(function* (encoded: string) {
  if (encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
    return yield* InvalidMealMedia.make({ message: 'Media must be canonical base64' })
  const bytes = Buffer.from(encoded, 'base64')
  if (bytes.byteLength === 0)
    return yield* InvalidMealMedia.make({ message: 'Media cannot be empty' })
  return bytes
})

const toMealEstimate = (record: MealEstimateRecord): MealEstimate => ({
  calories: record.estimate.calories,
  carbohydrates: record.estimate.carbohydrates,
  createdAt: record.estimate.created_at.toISOString(),
  description: record.estimate.description,
  estimateId: record.estimate.estimate_id,
  inputKind: record.estimate.input_kind,
  items: record.items.map((item) => ({
    amountGrams: item.amount_grams,
    calories: item.calories,
    carbohydrates: item.carbohydrates,
    confidence: item.confidence,
    description: item.description,
    evidence: item.evidence,
    foodId: item.food_id,
    name: item.name,
    ordinal: item.ordinal,
    protein: item.protein,
    resolved: item.resolved,
    sourceKind: item.source_kind,
    totalFat: item.total_fat,
  })),
  mediaRetained: record.estimate.media_object_key !== null,
  overallConfidence: record.estimate.overall_confidence,
  protein: record.estimate.protein,
  status: record.estimate.status,
  totalFat: record.estimate.total_fat,
  transcript: record.estimate.transcript,
  unresolvedItems: record.items.filter((item) => !item.resolved).map((item) => item.description),
})

export const makeMealEstimationLayer = (options: {
  readonly observationModel: string
  readonly resolutionModel: string
  readonly transcriptionModel: string
}) =>
  Layer.effect(
    MealEstimation,
    Effect.gen(function* () {
      const intelligence = yield* MealIntelligence
      const repository = yield* MealEstimateRepository
      const mapRepositoryError = (operation: 'load' | 'persist') => (cause: unknown) =>
        MealEstimationError.make({ cause, operation })

      const persist = Effect.fn('MealEstimation.persist')(function* (input: {
        readonly analysis: MealAnalysis
        readonly estimateId: string
        readonly inputDescription: string
        readonly inputKind: 'text' | 'photo' | 'voice'
        readonly mediaContentType: string | null
        readonly mediaObjectKey: string | null
        readonly mediaSha256: string | null
        readonly profileId: string
        readonly transcript: string | null
      }) {
        return yield* repository
          .save({
            ...input.analysis,
            estimateId: input.estimateId,
            inputDescription: input.inputDescription,
            inputKind: input.inputKind,
            items: input.analysis.items,
            mediaContentType: input.mediaContentType,
            mediaObjectKey: input.mediaObjectKey,
            mediaSha256: input.mediaSha256,
            observationModel: options.observationModel,
            profileId: input.profileId,
            promptVersion: mealPromptVersion,
            resolutionModel: options.resolutionModel,
            transcript: input.transcript,
            transcriptionModel: input.inputKind === 'voice' ? options.transcriptionModel : null,
          })
          .pipe(Effect.mapError(mapRepositoryError('persist')), Effect.map(toMealEstimate))
      })

      const analyzeMedia = Effect.fn('MealEstimation.analyzeMedia')(function* (
        profileId: string,
        input: Extract<CreateMealEstimate, { readonly kind: 'photo' | 'voice' }>,
      ) {
        const bytes = yield* decodeMealMediaBase64(input.dataBase64)
        if (input.kind === 'photo') {
          const analysis = yield* intelligence.analyzePhoto(
            profileId,
            bytes,
            input.mediaType,
            input.description,
          )
          return yield* persist({
            analysis,
            estimateId: input.estimateId,
            inputDescription: input.description ?? '',
            inputKind: input.kind,
            mediaContentType: null,
            mediaObjectKey: null,
            mediaSha256: null,
            profileId,
            transcript: null,
          })
        }
        const transcript = yield* intelligence.transcribe(bytes, input.mediaType)
        const analysis = yield* intelligence.analyzeText(profileId, transcript)
        return yield* persist({
          analysis,
          estimateId: input.estimateId,
          inputDescription: transcript,
          inputKind: input.kind,
          mediaContentType: null,
          mediaObjectKey: null,
          mediaSha256: null,
          profileId,
          transcript,
        })
      })

      return MealEstimation.of({
        create: Effect.fn('MealEstimation.create')(function* (profileId, input) {
          yield* Effect.annotateCurrentSpan({
            'meal.estimate.id': input.estimateId,
            'meal.input.kind': input.kind,
          })
          if (input.kind !== 'text') return yield* analyzeMedia(profileId, input)
          const analysis = yield* intelligence.analyzeText(profileId, input.description)
          return yield* persist({
            analysis,
            estimateId: input.estimateId,
            inputDescription: input.description,
            inputKind: input.kind,
            mediaContentType: null,
            mediaObjectKey: null,
            mediaSha256: null,
            profileId,
            transcript: null,
          })
        }),
        findById: Effect.fn('MealEstimation.findById')(function* (profileId, estimateId) {
          const found = yield* repository
            .findById(profileId, estimateId)
            .pipe(Effect.mapError(mapRepositoryError('load')))
          return found === undefined ? undefined : toMealEstimate(found)
        }),
      })
    }),
  )

const withAuthorizedProfile = <A, E, R>(profileId: string, effect: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const access = yield* ProfileAccessService
    const identity = yield* CurrentIdentity
    yield* fromProfileService(access.authorize(profileId, identity.userId))
    return yield* effect
  })

export const mealsHandlers = (api: typeof MonsApi) =>
  HttpApiBuilder.group(api, 'meals', (handlers) =>
    handlers.handleAll({
      listFoodLog: ({ params, query }) =>
        Effect.gen(function* () {
          const foodLog = yield* LegacyFoodLogService
          const identity = yield* CurrentIdentity
          return yield* fromProfileService(
            foodLog.list(
              params.profileId,
              identity.userId,
              new Date(query.from),
              new Date(query.to),
            ),
          )
        }),
      saveFoodLogEntry: ({ params, payload }) =>
        Effect.gen(function* () {
          const foodLog = yield* LegacyFoodLogService
          const identity = yield* CurrentIdentity
          const entry = yield* fromProfileService(
            foodLog.save(params.profileId, identity.userId, payload),
          )
          if (entry === undefined)
            return yield* new NotFoundError({
              code: 'food_not_found',
              message: 'Food not found in the active catalog',
            })
          return entry
        }),
      deleteFoodLogEntry: ({ params }) =>
        Effect.gen(function* () {
          const foodLog = yield* LegacyFoodLogService
          const identity = yield* CurrentIdentity
          const deleted = yield* fromProfileService(
            foodLog.delete(params.profileId, identity.userId, params.entryId),
          )
          if (!deleted)
            return yield* new NotFoundError({
              code: 'entry_not_found',
              message: 'Food log entry not found',
            })
          return HttpApiSchema.NoContent.make()
        }),
      listMealLogs: ({ params, query }) =>
        withAuthorizedProfile(
          params.profileId,
          Effect.gen(function* () {
            const logging = yield* MealLogging
            const meals = yield* fromMealLogging(
              logging.list(params.profileId, new Date(query.from), new Date(query.to)),
            )
            return { meals: meals.map(toMealLog) }
          }),
        ),
      saveMealLog: ({ params, payload }) =>
        withAuthorizedProfile(
          params.profileId,
          Effect.gen(function* () {
            const logging = yield* MealLogging
            return toMealLog(yield* fromMealLogging(logging.save(params.profileId, payload)))
          }),
        ),
      updateMealLog: ({ params, payload }) =>
        withAuthorizedProfile(
          params.profileId,
          Effect.gen(function* () {
            if (payload.mealId.toLowerCase() !== params.mealId.toLowerCase())
              return yield* validationError('Invalid meal identifiers')
            const logging = yield* MealLogging
            return toMealLog(yield* fromMealLogging(logging.save(params.profileId, payload)))
          }),
        ),
      deleteMealLog: ({ params }) =>
        withAuthorizedProfile(
          params.profileId,
          Effect.gen(function* () {
            const logging = yield* MealLogging
            const deleted = yield* fromMealLogging(logging.delete(params.profileId, params.mealId))
            if (!deleted)
              return yield* new NotFoundError({ code: 'meal_not_found', message: 'Meal not found' })
            return HttpApiSchema.NoContent.make()
          }),
        ),
      getMealPhoto: ({ params }) =>
        withAuthorizedProfile(
          params.profileId,
          Effect.gen(function* () {
            const logging = yield* MealLogging
            const photo = yield* fromMealLogging(logging.photo(params.profileId, params.mealId))
            if (photo === undefined)
              return yield* new NotFoundError({
                code: 'meal_photo_not_found',
                message: 'Meal photo not found',
              })
            return photo
          }),
        ),
      describeMeal: ({ params, payload }) =>
        withAuthorizedProfile(
          params.profileId,
          Effect.gen(function* () {
            const logging = yield* MealLogging
            return { description: yield* fromMealLogging(logging.describe(payload.items)) }
          }),
        ),
      createMealEstimate: ({ params, payload }) =>
        withAuthorizedProfile(
          params.profileId,
          Effect.gen(function* () {
            const estimation = yield* MealEstimation
            return yield* fromMealEstimation(estimation.create(params.profileId, payload))
          }),
        ),
      getMealEstimate: ({ params }) =>
        withAuthorizedProfile(
          params.profileId,
          Effect.gen(function* () {
            const estimation = yield* MealEstimation
            const estimate = yield* fromMealEstimation(
              estimation.findById(params.profileId, params.estimateId),
            )
            if (estimate === undefined)
              return yield* new NotFoundError({
                code: 'meal_estimate_not_found',
                message: 'Meal estimate not found',
              })
            return estimate
          }),
        ),
      discardMealEstimate: ({ params }) =>
        withAuthorizedProfile(
          params.profileId,
          Effect.gen(function* () {
            const logging = yield* MealLogging
            const deleted = yield* fromMealLogging(
              logging.discardEstimate(params.profileId, params.estimateId),
            )
            if (!deleted)
              return yield* new NotFoundError({
                code: 'meal_estimate_not_found',
                message: 'Meal estimate not found',
              })
            return HttpApiSchema.NoContent.make()
          }),
        ),
    }),
  )

export type ServiceHttpError =
  | ForbiddenError
  | InternalApiError
  | NotFoundError
  | ServiceUnavailableError
  | ValidationError

const notFound = (code: string, message: string) => new NotFoundError({ code, message })

export const mealEstimationHttpError = (
  error: MealEstimationOperationError | MealEstimationError,
): ServiceHttpError =>
  Match.value(error).pipe(
    Match.tags({
      InvalidMealMedia: (cause) => validationError(cause.message),
      MealEstimationError: (cause) =>
        cause.operation === 'analyze'
          ? serviceUnavailableError('Meal analysis is temporarily unavailable')
          : internalApiError(),
      MealIntelligenceError: () =>
        serviceUnavailableError('Meal analysis is temporarily unavailable'),
    }),
    Match.exhaustive,
  )

export const mealLoggingHttpError = (error: MealLoggingError): ServiceHttpError =>
  Match.value(error).pipe(
    Match.tags({
      InvalidMealPhoto: (cause) => validationError(cause.message),
      MealEstimateOwnershipError: forbiddenError,
      MealLogOwnershipError: forbiddenError,
      MealLogNotFoundError: (cause) => notFound('food_not_found', cause.message),
      R2ObjectNotFound: () => notFound('meal_photo_not_found', 'Meal photo not found'),
      MealIntelligenceError: () =>
        serviceUnavailableError('Meal analysis is temporarily unavailable'),
      R2StorageError: () => serviceUnavailableError('Meal media is temporarily unavailable'),
      R2StorageUnavailable: () => serviceUnavailableError('Meal media is temporarily unavailable'),
      InvalidR2ObjectKey: internalApiError,
      MealEstimateInvariantError: internalApiError,
      MealLogInvariantError: internalApiError,
      SchemaError: internalApiError,
      SqlError: internalApiError,
    }),
    Match.exhaustive,
  )

export const fromMealEstimation = <A, R>(
  effect: Effect.Effect<A, MealEstimationOperationError | MealEstimationError, R>,
) =>
  effect.pipe(
    Effect.tapError((error) => Effect.logError('Meal estimation failed', error)),
    Effect.mapError(mealEstimationHttpError),
  )

export const fromMealLogging = <A, R>(effect: Effect.Effect<A, MealLoggingError, R>) =>
  effect.pipe(
    Effect.tapError((error) => Effect.logError('Meal logging failed', error)),
    Effect.mapError(mealLoggingHttpError),
  )

const confidenceSchema = Schema.Finite.check(Schema.isBetween({ minimum: 0, maximum: 1 }))
const amountGramsSchema = Schema.Finite.check(Schema.isBetween({ minimum: 0.1, maximum: 100_000 }))

const mealObservationItemFields = {
  amountGrams: amountGramsSchema,
  confidence: confidenceSchema,
  description: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(200)),
  evidence: Schema.String.check(Schema.isMaxLength(1_000)),
  searchQuery: Schema.String.check(Schema.isMinLength(2), Schema.isMaxLength(200)),
}

export class MealObservationItem extends Schema.Class<MealObservationItem>('MealObservationItem')(
  mealObservationItemFields,
) {}

const mealObservationFields = {
  description: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(20_000)),
  items: Schema.Array(MealObservationItem).check(Schema.isMaxLength(50)),
  overallConfidence: confidenceSchema,
}

export class MealObservation extends Schema.Class<MealObservation>('MealObservation')(
  mealObservationFields,
) {}

// Named Effect classes generate JSON Schema references. Some gateway providers misinterpret a
// referenced array item schema, so the model receives this equivalent inline wire schema. The
// result is still decoded through MealObservation before it enters the application.
export const mealObservationOutputSchema = Schema.Struct({
  ...mealObservationFields,
  items: Schema.Array(Schema.Struct(mealObservationItemFields)).check(Schema.isMaxLength(50)),
})

class MealResolutionSelection extends Schema.Class<MealResolutionSelection>(
  'MealResolutionSelection',
)({
  confidence: confidenceSchema,
  evidence: Schema.String.check(Schema.isMaxLength(1_000)),
  foodKey: Schema.NullOr(Schema.String.check(Schema.isMinLength(3), Schema.isMaxLength(200))),
  observationOrdinal: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 49 })),
}) {}

class MealResolution extends Schema.Class<MealResolution>('MealResolution')({
  description: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(200)),
  selections: Schema.Array(MealResolutionSelection).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(50),
  ),
}) {}

const MealSearchInput = Schema.Struct({
  limit: Schema.Number,
  query: Schema.String,
})

const MealResolutionWire = Schema.Struct({
  description: Schema.String,
  selections: Schema.Array(
    Schema.Struct({
      confidence: Schema.Number,
      evidence: Schema.String,
      foodKey: Schema.NullOr(Schema.String),
      observationOrdinal: Schema.Number,
    }),
  ),
})

const MealDescriptionWire = Schema.Struct({ description: Schema.String })

const standardAiSchema = <S extends Schema.ConstraintDecoder<unknown> & Schema.Constraint>(
  schema: S,
) => Schema.toStandardSchemaV1(Schema.toStandardJSONSchemaV1(schema))

const resolutionOutput = Output.object({
  description: 'A catalog selection for each observed food.',
  name: 'meal_resolution',
  schema: standardAiSchema(MealResolutionWire),
})

const descriptionOutput = Output.object({
  description: 'A concise, natural meal description.',
  name: 'meal_description',
  schema: standardAiSchema(MealDescriptionWire),
})

const observationOutput = Output.object({
  description: 'A structured decomposition of the observed meal.',
  name: 'meal_observation',
  schema: standardAiSchema(mealObservationOutputSchema),
})

const observationInstructions = `You decompose meals into distinct foods for nutrition logging.
Return one item per visible or described food, including sauces, oils, beverages, and toppings when supported by evidence.
Never combine alternatives into one item and never use "or" in an item description or search query.
For drinks, separate the base beverage from milk, cream, sweeteners, and other additions when they are visible or supplied in user context.
Account for visually hidden ingredients such as cooking oil, butter, dressings, and sweeteners when the user states them or the preparation strongly implies them. Mark inferred ingredients with lower confidence and explain the inference in evidence; do not add them when there is no support.
Estimate edible grams conservatively. Use ordinary catalog-friendly search terms that preserve preparation method.
Do not invent calories, macros, nutrient values, barcodes, brands, or database identifiers.
If portion size is uncertain, lower confidence and explain why in evidence.
If the input does not describe or show any food or drink, return an empty items array. Briefly explain that no food was identified in description; do not invent a meal.
Return an object with description, overallConfidence, and an items array. Every item must contain amountGrams, confidence, description, evidence, and searchQuery.`

const observationSchemaRecoveryInstructions = `Your previous response failed schema validation.
Return exactly one object matching the requested schema. The items field must be an array of objects, never an array of strings. Keep amountGrams, confidence, description, evidence, and searchQuery inside each item object. Do not place item fields beside the items array.`

export interface MealSearchCandidate {
  readonly brand: string | null
  readonly calories: number
  readonly carbohydrates: number
  readonly foodId: string
  readonly foodKey: string
  readonly name: string
  readonly protein: number
  readonly sourceKind: FoodSourceKind
  readonly totalFat: number
}

export interface MealResolutionRequest {
  readonly observation: MealObservation
  readonly searchCatalog: (
    query: string,
    limit: number,
  ) => Promise<ReadonlyArray<MealSearchCandidate>>
  readonly searchPersonal: (
    query: string,
    limit: number,
  ) => Promise<ReadonlyArray<MealSearchCandidate>>
}

export interface MealAiClient {
  readonly describe: (input: {
    readonly items: ReadonlyArray<{ readonly name: string; readonly quantityGrams: number }>
    readonly model: string
  }) => Promise<typeof MealDescriptionWire.Type>
  readonly observePhoto: (input: {
    readonly bytes: Uint8Array
    readonly context?: string
    readonly mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
    readonly model: string
    readonly schemaRetry: boolean
  }) => Promise<MealObservation>
  readonly observeText: (input: {
    readonly model: string
    readonly schemaRetry: boolean
    readonly text: string
  }) => Promise<MealObservation>
  readonly resolve: (
    input: MealResolutionRequest & { readonly model: string },
  ) => Promise<MealResolution>
  readonly transcribe: (input: {
    readonly bytes: Uint8Array
    readonly mediaType: 'audio/m4a' | 'audio/mp4' | 'audio/mpeg' | 'audio/wav' | 'audio/webm'
    readonly model: string
  }) => Promise<string>
}

export const makeMealAiClient = (options?: {
  readonly languageModel?: (model: string) => LanguageModel
}): MealAiClient => {
  const languageModel = options?.languageModel ?? ((model: string) => model)
  return {
    describe: async ({ items, model }) => {
      const result = await generateText({
        instructions:
          'Write a concise, natural meal description of at most 200 characters. Use only the supplied foods, avoid nutrition claims, and do not include quantities unless they distinguish the meal.',
        maxRetries: 1,
        model: languageModel(model),
        output: descriptionOutput,
        prompt: JSON.stringify(items),
        temperature: 0,
      })
      return Schema.decodeUnknownPromise(MealDescriptionWire)(result.output)
    },
    observePhoto: async ({ bytes, context, mediaType, model, schemaRetry }) => {
      const normalizedContext = context?.trim()
      const request =
        normalizedContext === undefined || normalizedContext.length === 0
          ? 'Describe and decompose this meal for database-backed nutrition logging.'
          : `Describe and decompose this meal for database-backed nutrition logging. The user added this context: ${JSON.stringify(normalizedContext)}. Treat it as evidence about what was served or consumed; use the image to estimate portions and do not add ingredients unsupported by either source.`
      const result = await generateText({
        maxRetries: 1,
        messages: [
          {
            content: [
              {
                text: request,
                type: 'text',
              },
              {
                data: { data: bytes, type: 'data' },
                mediaType,
                type: 'file',
              },
            ],
            role: 'user',
          },
        ],
        model: languageModel(model),
        output: observationOutput,
        system: `${observationInstructions}${schemaRetry ? `\n${observationSchemaRecoveryInstructions}` : ''}`,
        temperature: 0,
      })
      return Schema.decodeUnknownPromise(MealObservation)(result.output)
    },
    observeText: async ({ model, schemaRetry, text }) => {
      const result = await generateText({
        maxRetries: 1,
        model: languageModel(model),
        output: observationOutput,
        prompt: text,
        system: `${observationInstructions}${schemaRetry ? `\n${observationSchemaRecoveryInstructions}` : ''}`,
        temperature: 0,
      })
      return Schema.decodeUnknownPromise(MealObservation)(result.output)
    },
    resolve: async ({ model, observation, searchCatalog, searchPersonal }) => {
      const searchCatalogTool = tool({
        description:
          'Searches valid USDA and Open Food Facts catalog records. Returns real IDs that may be selected.',
        execute: ({ limit, query }) =>
          searchCatalog(query.trim().slice(0, 200), Math.max(1, Math.min(20, Math.trunc(limit)))),
        inputSchema: standardAiSchema(MealSearchInput),
      })
      const searchPersonalTool = tool({
        description:
          'Searches this profile custom foods and calculated recipes. Returns real IDs that may be selected.',
        execute: ({ limit, query }) =>
          searchPersonal(query.trim().slice(0, 200), Math.max(1, Math.min(20, Math.trunc(limit)))),
        inputSchema: standardAiSchema(MealSearchInput),
      })
      const result = await generateText({
        instructions: `Resolve every observed item to the best real food record and write a concise natural description for the complete meal.
Use the search tools for every item. Prefer a specific preparation match over a generic name.
Only return a foodKey that appeared in a tool result from this request. Return null when no candidate is defensible.
Return exactly one selection for every observationOrdinal and do not change quantities.`,
        maxRetries: 1,
        model: languageModel(model),
        output: resolutionOutput,
        prompt: JSON.stringify(observation),
        stopWhen: stepCountIs(10),
        temperature: 0,
        tools: { searchCatalog: searchCatalogTool, searchPersonal: searchPersonalTool },
      })
      return result.output
    },
    transcribe: async ({ bytes, mediaType, model }) => {
      const result = await generateText({
        maxRetries: 1,
        messages: [
          {
            content: [
              {
                text: 'Transcribe this meal description accurately. Return only the spoken words without commentary, formatting, or inferred details.',
                type: 'text',
              },
              {
                data: { data: bytes, type: 'data' },
                mediaType,
                type: 'file',
              },
            ],
            role: 'user',
          },
        ],
        model: languageModel(model),
        temperature: 0,
      })
      return result.text
    },
  }
}

export const defaultMealAiClient: MealAiClient = makeMealAiClient()

export const defaultMealObservationModel = 'google/gemini-3.7-flash'
export const defaultMealResolutionModel = 'google/gemini-3.7-flash'
export const defaultMealTranscriptionModel = 'google/gemini-3.7-flash'
export const mealPromptVersion = 'meal-estimation-v2'

export const mealObservationModelConfig = Config.nonEmptyString(
  'AI_GATEWAY_MEAL_OBSERVATION_MODEL',
).pipe(Config.withDefault(defaultMealObservationModel))
export const mealResolutionModelConfig = Config.nonEmptyString(
  'AI_GATEWAY_MEAL_RESOLUTION_MODEL',
).pipe(Config.withDefault(defaultMealResolutionModel))
export const mealTranscriptionModelConfig = Config.nonEmptyString(
  'AI_GATEWAY_TRANSCRIPTION_MODEL',
).pipe(Config.withDefault(defaultMealTranscriptionModel))

export class MealIntelligenceError extends Schema.TaggedErrorClass<MealIntelligenceError>()(
  'MealIntelligenceError',
  {
    cause: Schema.Defect(),
    model: Schema.String,
    operation: Schema.Literals([
      'describe',
      'observe_photo',
      'observe_text',
      'resolve',
      'transcribe',
    ]),
  },
) {}

export interface MealAnalysis {
  readonly carbohydrates: number
  readonly description: string
  readonly calories: number
  readonly items: ReadonlyArray<MealEstimateItem>
  readonly overallConfidence: number
  readonly protein: number
  readonly totalFat: number
  readonly unresolvedItems: ReadonlyArray<string>
}

export interface MealIntelligenceService {
  readonly analyzePhoto: (
    profileId: string,
    bytes: Uint8Array,
    mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
    context?: string,
  ) => Effect.Effect<MealAnalysis, MealIntelligenceError>
  readonly analyzeText: (
    profileId: string,
    text: string,
  ) => Effect.Effect<MealAnalysis, MealIntelligenceError>
  readonly describe: (
    items: ReadonlyArray<{ readonly name: string; readonly quantityGrams: number }>,
  ) => Effect.Effect<string, MealIntelligenceError>
  readonly transcribe: (
    bytes: Uint8Array,
    mediaType: 'audio/m4a' | 'audio/mp4' | 'audio/mpeg' | 'audio/wav' | 'audio/webm',
  ) => Effect.Effect<string, MealIntelligenceError>
}

export class MealIntelligence extends Context.Service<MealIntelligence, MealIntelligenceService>()(
  '@mons/api/MealIntelligence',
) {}

const completeNutrition = (
  calories: number | null,
  protein: number | null,
  carbohydrates: number | null,
  totalFat: number | null,
) =>
  calories === null || protein === null || carbohydrates === null || totalFat === null
    ? undefined
    : { calories, carbohydrates, protein, totalFat }

const fromCatalogFood = (food: FoodSearchRecord): MealSearchCandidate | undefined => {
  // Meal estimation currently resolves quantities in grams. Per-serving restaurant
  // foods stay searchable but cannot be used as gram-based resolver candidates.
  if (food.dataset_kind === 'restaurant') return undefined
  const nutrition = completeNutrition(
    food.calories,
    food.protein,
    food.carbohydrates_total,
    food.total_fat,
  )
  return nutrition === undefined
    ? undefined
    : {
        ...nutrition,
        brand: food.brand,
        foodId: food.food_id,
        foodKey: `${food.dataset_kind}:${food.food_id}`,
        name: food.name,
        sourceKind: food.dataset_kind,
      }
}

const fromCustomFood = (record: CustomFoodRecord): MealSearchCandidate | undefined => {
  const food = record.food
  const nutrition = completeNutrition(
    food.calories_per_100g,
    food.protein_per_100g,
    food.carbohydrates_per_100g,
    food.fat_per_100g,
  )
  return nutrition === undefined
    ? undefined
    : {
        ...nutrition,
        brand: food.brand,
        foodId: food.food_id,
        foodKey: `custom:${food.food_id}`,
        name: food.name,
        sourceKind: 'custom',
      }
}

const fromRecipe = (record: RecipeRecord): MealSearchCandidate | undefined => {
  const recipe = record.recipe
  const nutrition = completeNutrition(
    recipe.calories_per_100g,
    recipe.protein_per_100g,
    recipe.carbohydrates_per_100g,
    recipe.fat_per_100g,
  )
  return nutrition === undefined || recipe.nutrition_status === 'estimate_pending'
    ? undefined
    : {
        ...nutrition,
        brand: null,
        foodId: recipe.recipe_id,
        foodKey: `recipe:${recipe.recipe_id}`,
        name: recipe.name,
        sourceKind: 'recipe',
      }
}

const normalizeSearch = (value: string) =>
  value
    .normalize('NFKD')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, ' ')
    .trim()

const searchPersonalCandidates = (
  query: string,
  limit: number,
  customFoods: ReadonlyArray<CustomFoodRecord>,
  recipes: ReadonlyArray<RecipeRecord>,
) => {
  const terms = normalizeSearch(query)
    .split(' ')
    .filter((term) => term.length > 0)
  const candidates = [
    ...customFoods.flatMap((record) => {
      const candidate = fromCustomFood(record)
      return candidate === undefined ? [] : [candidate]
    }),
    ...recipes.flatMap((record) => {
      const candidate = fromRecipe(record)
      return candidate === undefined ? [] : [candidate]
    }),
  ]
  return candidates
    .filter((candidate) => {
      const haystack = normalizeSearch(`${candidate.name} ${candidate.brand ?? ''}`)
      return terms.every((term) => haystack.includes(term))
    })
    .toSorted((left, right) => {
      const leftName = normalizeSearch(left.name)
      const rightName = normalizeSearch(right.name)
      const normalizedQuery = normalizeSearch(query)
      const leftScore =
        leftName === normalizedQuery ? 0 : leftName.startsWith(normalizedQuery) ? 1 : 2
      const rightScore =
        rightName === normalizedQuery ? 0 : rightName.startsWith(normalizedQuery) ? 1 : 2
      return leftScore - rightScore || left.foodKey.localeCompare(right.foodKey)
    })
    .slice(0, limit)
}

const roundNutrition = (value: number) => Math.round(value * 1_000_000) / 1_000_000

const resolveAnalysis = (
  observation: MealObservation,
  resolution: MealResolution,
  candidates: ReadonlyMap<string, MealSearchCandidate>,
): MealAnalysis => {
  const selectionByOrdinal = new Map(
    resolution.selections.map((selection) => [selection.observationOrdinal, selection]),
  )
  const items = observation.items.map((item, ordinal): MealEstimateItem => {
    const selection = selectionByOrdinal.get(ordinal)
    const candidate =
      selection?.foodKey === null ? undefined : candidates.get(selection?.foodKey ?? '')
    if (candidate === undefined) {
      return {
        amountGrams: item.amountGrams,
        calories: 0,
        carbohydrates: 0,
        confidence: Math.min(item.confidence, selection?.confidence ?? 0),
        description: item.description,
        evidence: selection?.evidence ?? item.evidence,
        foodId: null,
        name: item.description,
        ordinal,
        protein: 0,
        resolved: false,
        sourceKind: null,
        totalFat: 0,
      }
    }
    const scale = item.amountGrams / 100
    return {
      amountGrams: item.amountGrams,
      calories: roundNutrition(candidate.calories * scale),
      carbohydrates: roundNutrition(candidate.carbohydrates * scale),
      confidence: Math.min(item.confidence, selection?.confidence ?? 0),
      description: item.description,
      evidence: selection?.evidence ?? item.evidence,
      foodId: candidate.foodId,
      name: candidate.name,
      ordinal,
      protein: roundNutrition(candidate.protein * scale),
      resolved: true,
      sourceKind: candidate.sourceKind,
      totalFat: roundNutrition(candidate.totalFat * scale),
    }
  })
  const resolvedItems = items.filter((item) => item.resolved)
  const resolutionConfidence =
    resolvedItems.length === 0
      ? 0
      : resolvedItems.reduce((sum, item) => sum + item.confidence, 0) / resolvedItems.length
  return {
    calories: roundNutrition(items.reduce((sum, item) => sum + item.calories, 0)),
    carbohydrates: roundNutrition(items.reduce((sum, item) => sum + item.carbohydrates, 0)),
    description: resolution.description,
    items,
    overallConfidence: Math.min(observation.overallConfidence, resolutionConfidence),
    protein: roundNutrition(items.reduce((sum, item) => sum + item.protein, 0)),
    totalFat: roundNutrition(items.reduce((sum, item) => sum + item.totalFat, 0)),
    unresolvedItems: items.filter((item) => !item.resolved).map((item) => item.description),
  }
}

const emptyAnalysis = (observation: MealObservation): MealAnalysis => ({
  calories: 0,
  carbohydrates: 0,
  description: observation.description,
  items: [],
  overallConfidence: observation.overallConfidence,
  protein: 0,
  totalFat: 0,
  unresolvedItems: [],
})

export const makeMealIntelligenceLayer = (options: {
  readonly client?: MealAiClient
  readonly observationModel: string
  readonly resolutionModel: string
  readonly transcriptionModel: string
}) =>
  Layer.effect(
    MealIntelligence,
    Effect.gen(function* () {
      const catalog = yield* CatalogReader
      const userFoods = yield* LibraryRepository
      const client = options.client ?? defaultMealAiClient

      const mapAiError =
        (model: string, operation: MealIntelligenceError['operation']) => (cause: unknown) =>
          MealIntelligenceError.make({ cause, model, operation })

      const requestObservation = <A>(
        operation: 'observe_photo' | 'observe_text',
        request: (schemaRetry: boolean) => Promise<A>,
      ) => {
        const attempt = (schemaRetry: boolean) =>
          Effect.tryPromise({
            catch: mapAiError(options.observationModel, operation),
            try: () => request(schemaRetry),
          })
        return attempt(false).pipe(
          Effect.catchIf(
            (error) => NoObjectGeneratedError.isInstance(error.cause),
            () =>
              Effect.logWarning('Retrying meal observation after invalid structured output', {
                model: options.observationModel,
                operation,
              }).pipe(Effect.andThen(attempt(true))),
          ),
        )
      }

      const resolve = Effect.fn('MealIntelligence.resolve')(function* (
        profileId: string,
        observation: MealObservation,
      ) {
        if (observation.items.length === 0) return emptyAnalysis(observation)

        const library = yield* Effect.all(
          {
            customFoods: userFoods.listCustomFoods(profileId),
            recipes: userFoods.listRecipes(profileId),
          },
          { concurrency: 'unbounded' },
        ).pipe(Effect.mapError(mapAiError(options.resolutionModel, 'resolve')))
        const candidates = new Map<string, MealSearchCandidate>()
        const remember = (items: ReadonlyArray<MealSearchCandidate>) => {
          for (const item of items) candidates.set(item.foodKey, item)
          return items
        }
        const searchCatalog = (query: string, limit: number) =>
          Effect.runPromise(
            catalog.search({ limit, query }).pipe(
              Effect.map((foods) =>
                remember(
                  foods.flatMap((food) => {
                    const candidate = fromCatalogFood(food)
                    return candidate === undefined ? [] : [candidate]
                  }),
                ),
              ),
            ),
          )
        const searchPersonal = (query: string, limit: number) =>
          Promise.resolve(
            remember(searchPersonalCandidates(query, limit, library.customFoods, library.recipes)),
          )
        const resolution = yield* Effect.tryPromise({
          catch: mapAiError(options.resolutionModel, 'resolve'),
          try: () =>
            client.resolve({
              model: options.resolutionModel,
              observation,
              searchCatalog,
              searchPersonal,
            }),
        })
        return resolveAnalysis(observation, resolution, candidates)
      })

      const analyzeText = Effect.fn('MealIntelligence.analyzeText')(function* (
        profileId: string,
        text: string,
      ) {
        const observation = yield* requestObservation('observe_text', (schemaRetry) =>
          client.observeText({ model: options.observationModel, schemaRetry, text }),
        )
        return yield* resolve(profileId, observation)
      })

      return MealIntelligence.of({
        analyzePhoto: Effect.fn('MealIntelligence.analyzePhoto')(
          function* (profileId, bytes, mediaType, context) {
            const observation = yield* requestObservation('observe_photo', (schemaRetry) =>
              client.observePhoto({
                bytes,
                ...(context === undefined ? {} : { context }),
                mediaType,
                model: options.observationModel,
                schemaRetry,
              }),
            )
            return yield* resolve(profileId, observation)
          },
        ),
        analyzeText,
        describe: Effect.fn('MealIntelligence.describe')(function* (items) {
          const raw = yield* Effect.tryPromise({
            catch: mapAiError(options.resolutionModel, 'describe'),
            try: () => client.describe({ items, model: options.resolutionModel }),
          })
          const decoded = yield* Schema.decodeUnknownEffect(MealDescriptionWire)(raw).pipe(
            Effect.mapError(mapAiError(options.resolutionModel, 'describe')),
          )
          const description = decoded.description.trim()
          if (description.length === 0 || description.length > 200)
            return yield* MealIntelligenceError.make({
              cause: new Error('Meal description was empty or too long'),
              model: options.resolutionModel,
              operation: 'describe',
            })
          return description
        }),
        transcribe: Effect.fn('MealIntelligence.transcribe')(function* (bytes, mediaType) {
          const transcript = yield* Effect.tryPromise({
            catch: mapAiError(options.transcriptionModel, 'transcribe'),
            try: () => client.transcribe({ bytes, mediaType, model: options.transcriptionModel }),
          })
          if (transcript.trim().length < 2)
            return yield* MealIntelligenceError.make({
              cause: new Error('Transcription did not contain a meal description'),
              model: options.transcriptionModel,
              operation: 'transcribe',
            })
          return transcript.trim()
        }),
      })
    }),
  )

type LegacyFoodLogServiceError = ProfileAccessDenied | ServicePersistenceError

export interface LegacyFoodLogServiceShape {
  readonly delete: (
    profileId: string,
    clerkUserId: string,
    entryId: string,
  ) => Effect.Effect<boolean, LegacyFoodLogServiceError>
  readonly list: (
    profileId: string,
    clerkUserId: string,
    from: Date,
    to: Date,
  ) => Effect.Effect<{ readonly entries: ReadonlyArray<FoodLogEntry> }, LegacyFoodLogServiceError>
  readonly save: (
    profileId: string,
    clerkUserId: string,
    input: {
      readonly datasetKind: 'raw' | 'branded' | 'restaurant' | 'custom' | 'recipe'
      readonly entryId: string
      readonly foodId: string
      readonly loggedAt: string
      readonly mealCategory: 'breakfast' | 'lunch' | 'dinner' | 'snack'
      readonly quantityGrams: number
    },
  ) => Effect.Effect<FoodLogEntry | undefined, LegacyFoodLogServiceError>
}

export const LegacyFoodLogService = Context.Service<LegacyFoodLogServiceShape>(
  '@mons/api/LegacyFoodLogService',
)

export const legacyFoodLogServiceLayer = Layer.effect(
  LegacyFoodLogService,
  Effect.gen(function* () {
    const access = yield* ProfileAccessService
    const repository = yield* LegacyFoodLogRepository
    return LegacyFoodLogService.of({
      delete: Effect.fn('LegacyFoodLogService.delete')(function* (profileId, clerkUserId, entryId) {
        yield* access.authorize(profileId, clerkUserId)
        return yield* fromRepository(
          'LegacyFoodLogRepository.delete',
          repository.delete(profileId, entryId),
        )
      }),
      list: Effect.fn('LegacyFoodLogService.list')(function* (profileId, clerkUserId, from, to) {
        yield* access.authorize(profileId, clerkUserId)
        const entries = yield* fromRepository(
          'LegacyFoodLogRepository.list',
          repository.list(profileId, from, to),
        )
        return { entries: entries.map(toFoodLogEntry) }
      }),
      save: Effect.fn('LegacyFoodLogService.save')(function* (profileId, clerkUserId, input) {
        yield* access.authorize(profileId, clerkUserId)
        const entry = yield* fromRepository(
          'LegacyFoodLogRepository.save',
          repository.save(profileId, { ...input, loggedAt: new Date(input.loggedAt) }),
        )
        return entry === undefined ? undefined : toFoodLogEntry(entry)
      }),
    })
  }),
)

export class InvalidMealPhoto extends Schema.TaggedErrorClass<InvalidMealPhoto>()(
  'InvalidMealPhoto',
  { message: Schema.String },
) {}

export type MealLoggingError =
  | InvalidMealPhoto
  | MealEstimateRepositoryError
  | MealIntelligenceError
  | MealLogRepositoryError
  | R2ObjectNotFound
  | R2OperationError

export interface MealPhoto {
  readonly dataBase64: string
  readonly mediaType: 'image/jpeg'
}

export interface MealLoggingService {
  readonly delete: (profileId: string, mealId: string) => Effect.Effect<boolean, MealLoggingError>
  readonly describe: (
    items: ReadonlyArray<{ readonly name: string; readonly quantityGrams: number }>,
  ) => Effect.Effect<string, MealLoggingError>
  readonly discardEstimate: (
    profileId: string,
    estimateId: string,
  ) => Effect.Effect<boolean, MealLoggingError>
  readonly list: (
    profileId: string,
    from: Date,
    to: Date,
  ) => Effect.Effect<ReadonlyArray<MealLogRecord>, MealLoggingError>
  readonly photo: (
    profileId: string,
    mealId: string,
  ) => Effect.Effect<MealPhoto | undefined, MealLoggingError>
  readonly save: (
    profileId: string,
    input: SaveMealLog,
  ) => Effect.Effect<MealLogRecord, MealLoggingError>
}

export class MealLogging extends Context.Service<MealLogging, MealLoggingService>()(
  '@mons/api/MealLogging',
) {}

const decodeMealPhotoBase64 = Effect.fn('MealLogging.decodeBase64')(function* (encoded: string) {
  if (encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
    return yield* InvalidMealPhoto.make({ message: 'Photo must be canonical base64' })
  const bytes = Buffer.from(encoded, 'base64')
  if (bytes.byteLength === 0)
    return yield* InvalidMealPhoto.make({ message: 'Photo cannot be empty' })
  return bytes
})

const cleanupDelayMillis = 10 * 60 * 1_000

export const makeMealLoggingLayer = (options: { readonly storagePrefix: string }) =>
  Layer.effect(
    MealLogging,
    Effect.gen(function* () {
      const estimates = yield* MealEstimateRepository
      const intelligence = yield* MealIntelligence
      const meals = yield* MealLogRepository
      const storage = yield* R2Storage

      const drainMediaCleanup = Effect.fn('MealLogging.drainMediaCleanup')(function* () {
        const keys = yield* meals.listMediaCleanup(25)
        yield* Effect.forEach(
          keys,
          (key) =>
            storage.deleteObject(key).pipe(
              Effect.flatMap(() => meals.completeMediaCleanup(key)),
              Effect.tapError((error) =>
                Effect.logWarning('Meal media cleanup failed', { error, objectKey: key }),
              ),
              Effect.ignore,
            ),
          { concurrency: 4, discard: true },
        )
      })

      yield* drainMediaCleanup().pipe(
        Effect.repeat(Schedule.spaced('1 minute')),
        Effect.forkScoped({ startImmediately: true }),
      )

      const discardEstimate = Effect.fn('MealLogging.discardEstimate')(function* (
        profileId: string,
        estimateId: string,
      ) {
        const estimate = yield* estimates.findById(profileId, estimateId)
        if (estimate === undefined) return false
        yield* estimates.delete(profileId, estimateId)
        yield* drainMediaCleanup()
        return true
      })

      const save = Effect.fn('MealLogging.save')(function* (profileId: string, input: SaveMealLog) {
        const encodedPhoto = input.photoDataBase64
        const photo =
          encodedPhoto === undefined
            ? undefined
            : yield* Effect.gen(function* () {
                if (input.estimateId === null)
                  return yield* InvalidMealPhoto.make({
                    message: 'A retained photo requires an estimate',
                  })
                const estimate = yield* estimates.findById(profileId, input.estimateId)
                if (estimate?.estimate.input_kind !== 'photo')
                  return yield* InvalidMealPhoto.make({
                    message: 'The estimate is not a photo analysis',
                  })
                const bytes = yield* decodeMealPhotoBase64(encodedPhoto)
                return {
                  bytes,
                  estimateId: input.estimateId,
                  key: `${options.storagePrefix}/profiles/${profileId}/meal-estimates/${input.estimateId}/input.jpg`,
                }
              })
        const saveInput = {
          description: input.description,
          estimateId: input.estimateId,
          items: input.items,
          loggedAt: new Date(input.loggedAt),
          mealCategory: input.mealCategory,
          mealId: input.mealId,
        }
        if (photo === undefined) return yield* meals.save(profileId, saveInput)

        const currentTimeMillis = yield* Clock.currentTimeMillis
        yield* meals.enqueueMediaCleanup(
          photo.key,
          new Date(currentTimeMillis + cleanupDelayMillis),
        )
        yield* storage.putObject({ body: photo.bytes, contentType: 'image/jpeg', key: photo.key })
        const saved = yield* meals
          .save(profileId, {
            ...saveInput,
            media: {
              contentType: 'image/jpeg',
              objectKey: photo.key,
              sha256: createHash('sha256').update(photo.bytes).digest('hex'),
            },
          })
          .pipe(
            Effect.tapError(() =>
              storage.deleteObject(photo.key).pipe(
                Effect.flatMap(() => meals.completeMediaCleanup(photo.key)),
                Effect.ignore,
              ),
            ),
          )
        return saved
      })

      return MealLogging.of({
        delete: Effect.fn('MealLogging.delete')(function* (profileId, mealId) {
          const meal = yield* meals.findById(profileId, mealId)
          if (meal === undefined) return false
          yield* meals.delete(profileId, mealId)
          yield* drainMediaCleanup()
          return true
        }),
        describe: (items) => intelligence.describe(items),
        discardEstimate,
        list: (profileId, from, to) => meals.list(profileId, from, to),
        photo: Effect.fn('MealLogging.photo')(function* (profileId, mealId) {
          const meal = yield* meals.findById(profileId, mealId)
          const key = meal?.meal.media_object_key
          if (key === undefined || key === null) return undefined
          const object = yield* storage.getObject(key)
          return {
            dataBase64: Buffer.from(object.body).toString('base64'),
            mediaType: 'image/jpeg',
          }
        }),
        save,
      })
    }),
  )

export const mealLoggingLayer = makeMealLoggingLayer({ storagePrefix: 'test' })

const scaled = (value: number | null, quantityGrams: number): number | null =>
  value === null ? null : Math.round(value * quantityGrams * 10) / 1000

export const toFoodLogEntry = (entry: FoodLogEntryRecord): FoodLogEntry => ({
  brand: entry.brand,
  calories: scaled(entry.calories_per_100g, entry.quantity_grams),
  carbohydrates: scaled(entry.carbohydrates_per_100g, entry.quantity_grams),
  datasetKind: entry.dataset_kind,
  entryId: entry.entry_id,
  fat: scaled(entry.fat_per_100g, entry.quantity_grams),
  foodId: entry.food_id,
  gtin: entry.gtin,
  loggedAt: entry.logged_at.toISOString(),
  mealCategory: entry.meal_category,
  mealId: entry.meal_id,
  name: entry.name,
  protein: scaled(entry.protein_per_100g, entry.quantity_grams),
  quantityGrams: entry.quantity_grams,
})

export const toMealLog = (record: MealLogRecord): MealLog => {
  const items = record.items.map(toFoodLogEntry)
  const total = (field: 'calories' | 'carbohydrates' | 'fat' | 'protein') =>
    items.reduce((sum, item) => sum + (item[field] ?? 0), 0)
  return {
    calories: total('calories'),
    carbohydrates: total('carbohydrates'),
    description: record.meal.description,
    estimateId: record.meal.estimate_id,
    inputKind: record.meal.input_kind,
    items,
    loggedAt: record.meal.logged_at.toISOString(),
    mealCategory: record.meal.meal_category,
    mealId: record.meal.meal_id,
    photoAvailable: record.meal.input_kind === 'photo' && record.meal.media_object_key !== null,
    protein: total('protein'),
    totalFat: total('fat'),
  }
}
