import {
  NoObjectGeneratedError,
  Output,
  type LanguageModel,
  generateText,
  stepCountIs,
  tool,
} from 'ai'
import {
  CatalogReader,
  UserFoodRepository,
  type CustomFoodRecord,
  type FoodRecord,
  type RecipeRecord,
} from '@regolith/database'
import type { FoodSourceKind, MealEstimateItem } from '@regolith/contracts'
import { Config, Context, Effect, Layer, Schema } from 'effect'

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
  '@regolith/api/MealIntelligence',
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

const fromCatalogFood = (food: FoodRecord): MealSearchCandidate | undefined => {
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
      const userFoods = yield* UserFoodRepository
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
