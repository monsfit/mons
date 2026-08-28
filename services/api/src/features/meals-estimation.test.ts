import { assert, describe, it } from '@effect/vitest'
import {
  MealEstimateRepository,
  type MealEstimateRepositoryService,
  type SaveMealEstimateInput,
} from '@mons/database'
import { Effect, Layer } from 'effect'

import { MealIntelligence, type MealAnalysis, type MealIntelligenceService } from './meals.ts'
import { MealEstimation, makeMealEstimationLayer } from './meals.ts'

const analysis: MealAnalysis = {
  calories: 120,
  carbohydrates: 18,
  description: 'Example meal',
  items: [
    {
      amountGrams: 100,
      calories: 120,
      carbohydrates: 18,
      confidence: 0.9,
      description: 'Example food',
      evidence: 'Exact catalog match',
      foodId: 'food-42',
      name: 'Example Food',
      ordinal: 0,
      protein: 5,
      resolved: true,
      sourceKind: 'branded',
      totalFat: 2,
    },
  ],
  overallConfidence: 0.9,
  protein: 5,
  totalFat: 2,
  unresolvedItems: [],
}

const makeFixture = () => {
  const savedInputs: Array<SaveMealEstimateInput> = []
  const intelligence: MealIntelligenceService = {
    analyzePhoto: () => Effect.succeed(analysis),
    analyzeText: () => Effect.succeed(analysis),
    describe: () => Effect.succeed(analysis.description),
    transcribe: () => Effect.succeed('Example meal'),
  }
  const repository: MealEstimateRepositoryService = {
    delete: () => Effect.succeed(undefined),
    findById: () => Effect.succeed(undefined),
    save: (input) => {
      savedInputs.push(input)
      const createdAt = new Date('2026-08-05T00:00:00.000Z')
      return Effect.succeed({
        estimate: {
          calories: input.calories,
          carbohydrates: input.carbohydrates,
          created_at: createdAt,
          description: input.description,
          estimate_id: input.estimateId,
          input_description: input.inputDescription,
          input_kind: input.inputKind,
          media_content_type: input.mediaContentType,
          media_object_key: input.mediaObjectKey,
          media_sha256: input.mediaSha256,
          observation_model: input.observationModel,
          overall_confidence: input.overallConfidence,
          profile_id: input.profileId,
          prompt_version: input.promptVersion,
          protein: input.protein,
          resolution_model: input.resolutionModel,
          status: 'completed',
          total_fat: input.totalFat,
          transcript: input.transcript,
          transcription_model: input.transcriptionModel,
          updated_at: createdAt,
        },
        items: input.items.map((item) => ({
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
      })
    },
  }
  const dependencies = Layer.mergeAll(
    Layer.succeed(MealIntelligence)(intelligence),
    Layer.succeed(MealEstimateRepository)(repository),
  )
  const layer = makeMealEstimationLayer({
    observationModel: 'test-observer',
    resolutionModel: 'test-resolver',
    transcriptionModel: 'test-transcriber',
  }).pipe(Layer.provide(dependencies))

  return { layer, savedInputs }
}

describe('MealEstimation', () => {
  it.effect('does not retain voice media after transcription', () => {
    const fixture = makeFixture()
    return Effect.gen(function* () {
      const service = yield* MealEstimation
      const result = yield* service.create('profile-1', {
        dataBase64: 'AQID',
        estimateId: '00000000-0000-4000-8000-000000000111',
        kind: 'voice',
        mediaType: 'audio/m4a',
      })

      assert.strictEqual(result.mediaRetained, false)
      assert.strictEqual(result.transcript, 'Example meal')
      assert.strictEqual(fixture.savedInputs[0]?.mediaObjectKey, null)
      assert.strictEqual(fixture.savedInputs[0]?.transcriptionModel, 'test-transcriber')
    }).pipe(Effect.provide(fixture.layer))
  })

  it.effect('defers photo retention until the meal is confirmed', () => {
    const fixture = makeFixture()
    return Effect.gen(function* () {
      const service = yield* MealEstimation
      const result = yield* service.create('profile-2', {
        dataBase64: 'AQID',
        description: 'Coffee with milk and honey',
        estimateId: '00000000-0000-4000-8000-000000000112',
        kind: 'photo',
        mediaType: 'image/jpeg',
      })

      assert.strictEqual(result.mediaRetained, false)
      assert.strictEqual(fixture.savedInputs[0]?.inputDescription, 'Coffee with milk and honey')
      assert.strictEqual(fixture.savedInputs[0]?.mediaObjectKey, null)
      assert.strictEqual(fixture.savedInputs[0]?.mediaSha256, null)
    }).pipe(Effect.provide(fixture.layer))
  })
})
