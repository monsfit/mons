import { assert, describe, it } from '@effect/vitest'
import { MealLogOwnershipError, MealLogNotFoundError } from '@mons/database'

import { R2StorageUnavailable } from '../infrastructure/storage/r2-storage.ts'
import { InvalidMealMedia, MealEstimationError } from './meals.ts'
import { mealEstimationHttpError, mealLoggingHttpError } from './meals.ts'
import { InvalidMealPhoto } from './meals.ts'

describe('service error mapping', () => {
  it('preserves validation, ownership, and missing-resource semantics', () => {
    assert.strictEqual(
      mealLoggingHttpError(InvalidMealPhoto.make({ message: 'Bad photo' })).code,
      'validation_error',
    )
    assert.strictEqual(
      mealLoggingHttpError(MealLogOwnershipError.make({ message: 'Wrong owner' })).code,
      'forbidden',
    )
    assert.strictEqual(
      mealLoggingHttpError(MealLogNotFoundError.make({ message: 'Missing food' })).code,
      'food_not_found',
    )
  })

  it('distinguishes unavailable dependencies from internal persistence failures', () => {
    assert.strictEqual(
      mealLoggingHttpError(R2StorageUnavailable.make({ operation: 'putObject' })).code,
      'service_unavailable',
    )
    assert.strictEqual(
      mealEstimationHttpError(InvalidMealMedia.make({ message: 'Bad media' })).code,
      'validation_error',
    )
    assert.strictEqual(
      mealEstimationHttpError(
        MealEstimationError.make({ cause: new Error('database'), operation: 'persist' }),
      ).code,
      'internal_error',
    )
  })
})
