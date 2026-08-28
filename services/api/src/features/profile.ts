import type { MonsApi } from '../api.ts'
import { Authentication, CurrentIdentity } from '../core/auth.ts'
import { InternalApiError, RequestValidation, UnauthorizedError } from '../core/errors.ts'
import { fromService } from '../core/handler-errors.ts'
import {
  ProfileAccessDenied,
  type ServicePersistenceError,
  fromRepository,
} from '../core/service-errors.ts'
import { profileSchema } from '@mons/contracts'
import { ProfileRepository } from '@mons/database'
import { Context, Effect, Layer } from 'effect'
import { HttpApiBuilder, HttpApiEndpoint, HttpApiGroup } from 'effect/unstable/httpapi'

export interface ProfileAccessServiceShape {
  readonly authorize: (
    profileId: string,
    clerkUserId: string,
  ) => Effect.Effect<void, ProfileAccessDenied | ServicePersistenceError>
}

export const ProfileAccessService = Context.Service<ProfileAccessServiceShape>(
  '@mons/api/ProfileAccessService',
)

export const profileAccessServiceLayer = Layer.effect(
  ProfileAccessService,
  Effect.gen(function* () {
    const profiles = yield* ProfileRepository
    return ProfileAccessService.of({
      authorize: Effect.fn('ProfileAccessService.authorize')(function* (
        profileId: string,
        clerkUserId: string,
      ) {
        const allowed = yield* fromRepository(
          'ProfileRepository.belongsToClerkUser',
          profiles.belongsToClerkUser(profileId, clerkUserId),
        )
        if (!allowed) return yield* new ProfileAccessDenied()
      }),
    })
  }),
)

export const profileApi = HttpApiGroup.make('profile')
  .add(
    HttpApiEndpoint.put('ensureProfile', '/v1/profile', {
      success: profileSchema,
      error: [UnauthorizedError, InternalApiError],
    }),
  )
  .middleware(RequestValidation)
  .middleware(Authentication)

export const profileHandlers = (api: typeof MonsApi) =>
  HttpApiBuilder.group(api, 'profile', (handlers) =>
    handlers.handle('ensureProfile', () =>
      Effect.gen(function* () {
        const profiles = yield* ProfileService
        const identity = yield* CurrentIdentity
        return yield* fromService(profiles.ensure(identity.userId))
      }),
    ),
  )

export interface ProfileServiceShape {
  readonly ensure: (
    clerkUserId: string,
  ) => Effect.Effect<{ readonly profileId: string }, ServicePersistenceError>
}

export const ProfileService = Context.Service<ProfileServiceShape>('@mons/api/ProfileService')

export const profileServiceLayer = Layer.effect(
  ProfileService,
  Effect.gen(function* () {
    const profiles = yield* ProfileRepository
    return ProfileService.of({
      ensure: Effect.fn('ProfileService.ensure')(function* (clerkUserId: string) {
        const profileId = yield* fromRepository(
          'ProfileRepository.ensureForClerkUser',
          profiles.ensureForClerkUser(clerkUserId),
        )
        return { profileId }
      }),
    })
  }),
)
