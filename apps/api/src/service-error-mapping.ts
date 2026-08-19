import { Effect, Match } from 'effect'

import {
  ForbiddenError,
  InternalApiError,
  NotFoundError,
  ServiceUnavailableError,
  ValidationError,
  forbiddenError,
  internalApiError,
  serviceUnavailableError,
  validationError,
} from './errors.ts'
import type { MealEstimationError, MealEstimationOperationError } from './meal-estimation.ts'
import type { MealLoggingError } from './meal-logging.ts'

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
