import {
  MealEstimateRepository,
  type MealEstimateRepositoryError,
  MealLogRepository,
  type MealLogRecord,
  type MealLogRepositoryError,
} from '@mons/database'
import type { SaveMealLog } from '@mons/contracts'
import { Clock, Context, Effect, Layer, Schedule, Schema } from 'effect'
import { createHash } from 'node:crypto'

import { MealIntelligence, type MealIntelligenceError } from './meal-intelligence.ts'
import { R2Storage, type R2OperationError, type R2ObjectNotFound } from './r2-storage.ts'

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

const decodeBase64 = Effect.fn('MealLogging.decodeBase64')(function* (encoded: string) {
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
                const bytes = yield* decodeBase64(encodedPhoto)
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
