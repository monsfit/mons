import { Data, Effect } from 'effect'

export class ServicePersistenceError extends Data.TaggedError('ServicePersistenceError')<{
  readonly operation: string
}> {}

export class ProfileAccessDenied extends Data.TaggedError('ProfileAccessDenied')<{}> {}

export class SystemUnavailable extends Data.TaggedError('SystemUnavailable')<{}> {}

export const fromRepository = <A, E, R>(
  operation: string,
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, ServicePersistenceError, R> =>
  effect.pipe(
    Effect.tapError((error) => Effect.logError(`${operation} failed`, error)),
    Effect.mapError(() => new ServicePersistenceError({ operation })),
  )
