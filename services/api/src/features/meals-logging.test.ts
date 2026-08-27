import { assert, describe, it } from '@effect/vitest'
import {
  MealEstimateRepository,
  type MealEstimateRepositoryService,
  MealLogInvariantError,
  MealLogRepository,
  type MealLogRecord,
  type MealLogRepositoryService,
  type SaveMealLogInput,
} from '@regolith/database'
import { Effect, Exit, Layer } from 'effect'

import { type R2Client, makeR2StorageLayer } from '../infrastructure/storage/r2-storage.ts'
import { MealIntelligence, type MealIntelligenceService } from './meals.ts'
import { MealLogging, mealLoggingLayer } from './meals.ts'

const profileId = '00000000-0000-4000-8000-000000000001'
const estimateId = '00000000-0000-4000-8000-000000000002'
const mealId = '00000000-0000-4000-8000-000000000003'
const photoKey = `profiles/${profileId}/meal-estimates/${estimateId}/input.jpg`
const timestamp = new Date('2026-08-06T12:00:00.000Z')

const mealRecord: MealLogRecord = {
  meal: {
    created_at: timestamp,
    description: 'Coffee with milk',
    estimate_id: estimateId,
    input_kind: 'photo',
    logged_at: timestamp,
    meal_category: 'breakfast',
    meal_id: mealId,
    media_content_type: 'image/jpeg',
    media_object_key: photoKey,
    profile_id: profileId,
    updated_at: timestamp,
  },
  items: [],
}

const estimateRecord = {
  estimate: {
    calories: 40,
    carbohydrates: 5,
    created_at: timestamp,
    description: 'Coffee with milk',
    estimate_id: estimateId,
    input_description: '',
    input_kind: 'photo' as const,
    media_content_type: null,
    media_object_key: null,
    media_sha256: null,
    observation_model: 'test',
    overall_confidence: 0.8,
    profile_id: profileId,
    prompt_version: 'test',
    protein: 2,
    resolution_model: 'test',
    status: 'completed' as const,
    total_fat: 1,
    transcript: null,
    transcription_model: null,
    updated_at: timestamp,
  },
  items: [],
}

const saveRequest = {
  description: 'Coffee with milk',
  estimateId,
  items: [],
  loggedAt: timestamp.toISOString(),
  mealCategory: 'breakfast' as const,
  mealId,
  photoDataBase64: 'AQID',
  photoMediaType: 'image/jpeg' as const,
}

const intelligence: MealIntelligenceService = {
  analyzePhoto: () => Effect.die(new Error('Not exercised')),
  analyzeText: () => Effect.die(new Error('Not exercised')),
  describe: () => Effect.succeed('Coffee with milk'),
  transcribe: () => Effect.die(new Error('Not exercised')),
}

const makeFixture = (options: { readonly failSave?: boolean } = {}) => {
  const events: Array<string> = []
  const cleanup = new Set<string>()
  const savedInputs: Array<SaveMealLogInput> = []
  const estimates: MealEstimateRepositoryService = {
    delete: () => Effect.succeed(estimateRecord),
    findById: () => Effect.succeed(estimateRecord),
    save: () => Effect.die(new Error('Not exercised')),
  }
  const meals: MealLogRepositoryService = {
    completeMediaCleanup: (key) =>
      Effect.sync(() => {
        events.push(`cleanup-complete:${key}`)
        cleanup.delete(key)
      }),
    delete: () =>
      Effect.sync(() => {
        events.push('database-delete')
        cleanup.add(photoKey)
        return mealRecord
      }),
    enqueueMediaCleanup: (key) =>
      Effect.sync(() => {
        events.push(`cleanup-enqueue:${key}`)
        cleanup.add(key)
      }),
    findById: () => Effect.succeed(mealRecord),
    list: () => Effect.succeed([]),
    listMediaCleanup: () => Effect.sync(() => [...cleanup]),
    save: (_candidateProfileId, input) => {
      events.push('database-save')
      savedInputs.push(input)
      return options.failSave === true
        ? Effect.fail(MealLogInvariantError.make({ message: 'Injected save failure' }))
        : Effect.succeed(mealRecord)
    },
  }
  const client: R2Client = {
    deleteObject: async (key) => {
      events.push(`r2-delete:${key}`)
    },
    getObject: async () => undefined,
    putObject: async ({ key }) => {
      events.push(`r2-put:${key}`)
    },
  }
  const dependencies = Layer.mergeAll(
    Layer.succeed(MealEstimateRepository)(estimates),
    Layer.succeed(MealIntelligence)(intelligence),
    Layer.succeed(MealLogRepository)(meals),
    makeR2StorageLayer({ bucket: 'mons', client }),
  )

  return {
    events,
    layer: mealLoggingLayer.pipe(Layer.provide(dependencies)),
    savedInputs,
  }
}

describe('MealLogging', () => {
  it.effect('uploads first and commits the meal with media metadata atomically', () => {
    const fixture = makeFixture()
    return Effect.gen(function* () {
      const service = yield* MealLogging
      yield* service.save(profileId, saveRequest)

      assert.deepStrictEqual(fixture.events.slice(-3), [
        `cleanup-enqueue:${photoKey}`,
        `r2-put:${photoKey}`,
        'database-save',
      ])
      assert.strictEqual(fixture.savedInputs[0]?.media?.objectKey, photoKey)
    }).pipe(Effect.provide(fixture.layer))
  })

  it.effect('removes an uploaded object when the atomic database save fails', () => {
    const fixture = makeFixture({ failSave: true })
    return Effect.gen(function* () {
      const service = yield* MealLogging
      const exit = yield* Effect.exit(service.save(profileId, saveRequest))

      assert.isTrue(Exit.isFailure(exit))
      assert.deepStrictEqual(fixture.events.slice(-5), [
        `cleanup-enqueue:${photoKey}`,
        `r2-put:${photoKey}`,
        'database-save',
        `r2-delete:${photoKey}`,
        `cleanup-complete:${photoKey}`,
      ])
    }).pipe(Effect.provide(fixture.layer))
  })

  it.effect('commits deletion before attempting object cleanup', () => {
    const fixture = makeFixture()
    return Effect.gen(function* () {
      const service = yield* MealLogging
      assert.isTrue(yield* service.delete(profileId, mealId))
      assert.deepStrictEqual(fixture.events.slice(-3), [
        'database-delete',
        `r2-delete:${photoKey}`,
        `cleanup-complete:${photoKey}`,
      ])
    }).pipe(Effect.provide(fixture.layer))
  })
})
