import { assert, describe, it, layer } from '@effect/vitest'
import {
  CatalogReader,
  type CatalogReaderService,
  LibraryRepository,
  type LibraryRepositoryService,
} from '@mons/database'
import { Effect, Layer, Schema } from 'effect'

import {
  MealIntelligence,
  type MealAiClient,
  makeMealIntelligenceLayer,
  mealObservationOutputSchema,
} from './meals.ts'

const catalog: CatalogReaderService = {
  activeReleaseId: () => Effect.succeed('2026-08-27-test0001'),
  findById: () => Effect.succeed(undefined),
  findByGtin: () => Effect.succeed(undefined),
  search: () =>
    Effect.succeed([
      {
        brand: 'Example',
        calories: 120,
        carbohydrates_total: 18,
        dataset_kind: 'branded',
        default_portion: null,
        food_id: 'food-42',
        name: 'Example Food',
        nutrient_basis: { amount: 100, unit: 'g' },
        protein: 5,
        total_fat: 2,
      },
    ]),
}

const userFoods: LibraryRepositoryService = {
  deleteCustomFood: () => Effect.succeed(false),
  deleteRecipe: () => Effect.succeed(false),
  findCustomFoodByBarcode: () => Effect.succeed(undefined),
  listCustomFoods: () => Effect.succeed([]),
  listRecipes: () => Effect.succeed([]),
  saveCustomFood: () => Effect.die(new Error('not used')),
  saveRecipe: () => Effect.die(new Error('not used')),
}

const repositories = Layer.mergeAll(
  Layer.succeed(CatalogReader)(catalog),
  Layer.succeed(LibraryRepository)(userFoods),
)

const observation = {
  description: 'Example meal',
  items: [
    {
      amountGrams: 150,
      confidence: 0.8,
      description: 'example food',
      evidence: 'Explicit description',
      searchQuery: 'example food',
    },
  ],
  overallConfidence: 0.85,
}

const observedPhotoContexts: Array<string | undefined> = []

const client: MealAiClient = {
  describe: () => Promise.resolve({ description: 'Example meal' }),
  observePhoto: ({ context }) => {
    observedPhotoContexts.push(context)
    return Promise.resolve(observation)
  },
  observeText: () => Promise.resolve(observation),
  resolve: async ({ searchCatalog }) => {
    const candidates = await searchCatalog('example food', 10)
    return {
      description: 'Example meal',
      selections: [
        {
          confidence: 0.9,
          evidence: 'Exact catalog match',
          foodKey: candidates[0]?.foodKey ?? null,
          observationOrdinal: 0,
        },
      ],
    }
  },
  transcribe: () => Promise.resolve('150 grams of example food'),
}

describe('MealIntelligence', () => {
  it('emits an inline observation schema for gateway providers', () => {
    const standard = Schema.toStandardJSONSchemaV1(mealObservationOutputSchema)
    const jsonSchema = standard['~standard'].jsonSchema.input({ target: 'draft-07' })
    assert.notInclude(JSON.stringify(jsonSchema), '$ref')
    assert.notInclude(JSON.stringify(jsonSchema), 'definitions')
  })

  it.effect('accepts an empty observation when no meal is present', () =>
    Schema.decodeUnknownEffect(mealObservationOutputSchema)({
      description: 'No food or drink was identified',
      items: [],
      overallConfidence: 1,
    }).pipe(Effect.asVoid),
  )

  const intelligence = makeMealIntelligenceLayer({
    client,
    observationModel: 'test-observer',
    resolutionModel: 'test-resolver',
    transcriptionModel: 'test-transcriber',
  }).pipe(Layer.provide(repositories))

  layer(intelligence)((test) => {
    test.effect('scales only real catalog nutrition deterministically', () =>
      Effect.gen(function* () {
        const service = yield* MealIntelligence
        const result = yield* service.analyzeText('profile', 'example food')
        assert.strictEqual(result.calories, 180)
        assert.strictEqual(result.protein, 7.5)
        assert.strictEqual(result.carbohydrates, 27)
        assert.strictEqual(result.totalFat, 3)
        assert.strictEqual(result.overallConfidence, 0.8)
        assert.strictEqual(result.items[0]?.foodId, 'food-42')
        assert.deepStrictEqual(result.unresolvedItems, [])
      }),
    )

    test.effect('reuses transcription as text input', () =>
      Effect.gen(function* () {
        const service = yield* MealIntelligence
        assert.strictEqual(
          yield* service.transcribe(new Uint8Array([1, 2, 3]), 'audio/m4a'),
          '150 grams of example food',
        )
      }),
    )

    test.effect('passes hidden ingredient context into photo observation', () =>
      Effect.gen(function* () {
        const service = yield* MealIntelligence
        yield* service.analyzePhoto(
          'profile',
          new Uint8Array([1, 2, 3]),
          'image/jpeg',
          'Eggs cooked in olive oil',
        )
        assert.strictEqual(observedPhotoContexts.at(-1), 'Eggs cooked in olive oil')
      }),
    )

    test.effect('uses Luna to describe confirmed foods', () =>
      Effect.gen(function* () {
        const service = yield* MealIntelligence
        assert.strictEqual(
          yield* service.describe([{ name: 'Example Food', quantityGrams: 150 }]),
          'Example meal',
        )
      }),
    )
  })

  const hallucinatingClient: MealAiClient = {
    ...client,
    resolve: () =>
      Promise.resolve({
        description: 'Invented meal',
        selections: [
          {
            confidence: 1,
            evidence: 'Invented identifier',
            foodKey: 'branded:not-returned-by-a-tool',
            observationOrdinal: 0,
          },
        ],
      }),
  }
  const hallucinationLayer = makeMealIntelligenceLayer({
    client: hallucinatingClient,
    observationModel: 'test-observer',
    resolutionModel: 'test-resolver',
    transcriptionModel: 'test-transcriber',
  }).pipe(Layer.provide(repositories))

  it.layer(hallucinationLayer)((test) => {
    test.effect('rejects model-invented food identifiers from nutrition totals', () =>
      Effect.gen(function* () {
        const service = yield* MealIntelligence
        const result = yield* service.analyzeText('profile', 'example food')
        assert.strictEqual(result.calories, 0)
        assert.strictEqual(result.items[0]?.resolved, false)
        assert.deepStrictEqual(result.unresolvedItems, ['example food'])
      }),
    )
  })

  const noMealClient: MealAiClient = {
    ...client,
    observeText: () =>
      Promise.resolve({
        description: 'No food or drink was identified',
        items: [],
        overallConfidence: 1,
      }),
    resolve: () => Promise.reject(new Error('Resolution must not run without observed foods')),
  }
  const noMealLayer = makeMealIntelligenceLayer({
    client: noMealClient,
    observationModel: 'test-observer',
    resolutionModel: 'test-resolver',
    transcriptionModel: 'test-transcriber',
  }).pipe(Layer.provide(repositories))

  it.layer(noMealLayer)((test) => {
    test.effect('returns an empty estimate without invoking catalog resolution', () =>
      Effect.gen(function* () {
        const service = yield* MealIntelligence
        const result = yield* service.analyzeText('profile', 'hello')
        assert.strictEqual(result.description, 'No food or drink was identified')
        assert.deepStrictEqual(result.items, [])
        assert.strictEqual(result.calories, 0)
        assert.strictEqual(result.overallConfidence, 1)
      }),
    )
  })

  const schemaRetryAttempts: Array<boolean> = []
  const schemaRetryClient: MealAiClient = {
    ...client,
    observePhoto: ({ schemaRetry }) => {
      schemaRetryAttempts.push(schemaRetry)
      return schemaRetry
        ? Promise.resolve(observation)
        : Promise.reject({
            [Symbol.for('vercel.ai.error.AI_NoObjectGeneratedError')]: true,
          })
    },
  }
  const schemaRetryLayer = makeMealIntelligenceLayer({
    client: schemaRetryClient,
    observationModel: 'test-observer',
    resolutionModel: 'test-resolver',
    transcriptionModel: 'test-transcriber',
  }).pipe(Layer.provide(repositories))

  it.layer(schemaRetryLayer)((test) => {
    test.effect('retries malformed structured photo observations with stricter instructions', () =>
      Effect.gen(function* () {
        const service = yield* MealIntelligence
        const result = yield* service.analyzePhoto(
          'profile',
          new Uint8Array([1, 2, 3]),
          'image/jpeg',
        )
        assert.strictEqual(result.description, 'Example meal')
        assert.deepStrictEqual(schemaRetryAttempts, [false, true])
      }),
    )
  })
})
