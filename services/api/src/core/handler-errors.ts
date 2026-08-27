import { Effect } from 'effect'

import { forbiddenError, internalApiError, serviceUnavailableError } from './errors.ts'
import {
  ProfileAccessDenied,
  ServicePersistenceError,
  SystemUnavailable,
} from './service-errors.ts'

export const fromService = <A, E, R>(effect: Effect.Effect<A, E | ServicePersistenceError, R>) =>
  effect.pipe(Effect.catchTag('ServicePersistenceError', () => internalApiError()))

export const fromProfileService = <A, E, R>(
  effect: Effect.Effect<A, E | ServicePersistenceError | ProfileAccessDenied, R>,
) =>
  effect.pipe(
    Effect.catchTag('ServicePersistenceError', () => internalApiError()),
    Effect.catchTag('ProfileAccessDenied', () => forbiddenError()),
  )

export const fromSystemService = <A, E, R>(effect: Effect.Effect<A, E | SystemUnavailable, R>) =>
  effect.pipe(
    Effect.catchTag('SystemUnavailable', () => serviceUnavailableError('Database unavailable')),
  )
