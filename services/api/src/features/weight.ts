import type { MonsApi } from '../api.ts'
import { Authentication, CurrentIdentity } from '../core/auth.ts'
import {
  ForbiddenError,
  InternalApiError,
  NotFoundError,
  RequestValidation,
  ServiceUnavailableError,
  UnauthorizedError,
  ValidationError,
} from '../core/errors.ts'
import { fromProfileService } from '../core/handler-errors.ts'
import {
  type ProfileAccessDenied,
  type ServicePersistenceError,
  fromRepository,
} from '../core/service-errors.ts'
import { ProfileAccessService } from './profile.ts'
import {
  type WeightLogEntry,
  createWeightLogEntrySchema,
  profilePathSchema,
  timeRangeQuerySchema,
  weightLogEntryPathSchema,
  weightLogEntrySchema,
  weightLogResponseSchema,
} from '@mons/contracts'
import { type WeightLogEntryRecord, WeightRepository } from '@mons/database'
import { Context, Effect, Layer } from 'effect'
import {
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from 'effect/unstable/httpapi'

const profileErrors = [
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  NotFoundError,
  ServiceUnavailableError,
  InternalApiError,
]
const createdWeightLogEntrySchema = weightLogEntrySchema.pipe(HttpApiSchema.status(201))

export const weightApi = HttpApiGroup.make('weight')
  .add(
    HttpApiEndpoint.get('listWeightLog', '/v1/profiles/:profileId/weight-log', {
      params: profilePathSchema,
      query: timeRangeQuerySchema,
      success: weightLogResponseSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.post('saveWeightLogEntry', '/v1/profiles/:profileId/weight-log', {
      params: profilePathSchema,
      payload: createWeightLogEntrySchema,
      success: createdWeightLogEntrySchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.delete('deleteWeightLogEntry', '/v1/profiles/:profileId/weight-log/:entryId', {
      params: weightLogEntryPathSchema,
      error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
    }),
  )
  .middleware(RequestValidation)
  .middleware(Authentication)

export const weightHandlers = (api: typeof MonsApi) =>
  HttpApiBuilder.group(api, 'weight', (handlers) =>
    handlers.handleAll({
      listWeightLog: ({ params, query }) =>
        Effect.gen(function* () {
          const weight = yield* WeightService
          const identity = yield* CurrentIdentity
          return yield* fromProfileService(
            weight.list(
              params.profileId,
              identity.userId,
              new Date(query.from),
              new Date(query.to),
            ),
          )
        }),
      saveWeightLogEntry: ({ params, payload }) =>
        Effect.gen(function* () {
          const weight = yield* WeightService
          const identity = yield* CurrentIdentity
          return yield* fromProfileService(weight.save(params.profileId, identity.userId, payload))
        }),
      deleteWeightLogEntry: ({ params }) =>
        Effect.gen(function* () {
          const weight = yield* WeightService
          const identity = yield* CurrentIdentity
          const deleted = yield* fromProfileService(
            weight.delete(params.profileId, identity.userId, params.entryId),
          )
          if (!deleted)
            return yield* new NotFoundError({
              code: 'weight_not_found',
              message: 'Weight entry not found',
            })
          return HttpApiSchema.NoContent.make()
        }),
    }),
  )

export const toWeightLogEntry = (entry: WeightLogEntryRecord): WeightLogEntry => ({
  entryId: entry.entry_id,
  measuredAt: entry.measured_at.toISOString(),
  weightKg: entry.weight_kg,
})

type WeightServiceError = ProfileAccessDenied | ServicePersistenceError

export interface WeightServiceShape {
  readonly delete: (
    profileId: string,
    clerkUserId: string,
    entryId: string,
  ) => Effect.Effect<boolean, WeightServiceError>
  readonly list: (
    profileId: string,
    clerkUserId: string,
    from: Date,
    to: Date,
  ) => Effect.Effect<{ readonly entries: ReadonlyArray<WeightLogEntry> }, WeightServiceError>
  readonly save: (
    profileId: string,
    clerkUserId: string,
    input: { readonly entryId: string; readonly measuredAt: string; readonly weightKg: number },
  ) => Effect.Effect<WeightLogEntry, WeightServiceError>
}

export const WeightService = Context.Service<WeightServiceShape>('@mons/api/WeightService')

export const weightServiceLayer = Layer.effect(
  WeightService,
  Effect.gen(function* () {
    const access = yield* ProfileAccessService
    const repository = yield* WeightRepository
    return WeightService.of({
      delete: Effect.fn('WeightService.delete')(function* (profileId, clerkUserId, entryId) {
        yield* access.authorize(profileId, clerkUserId)
        return yield* fromRepository(
          'WeightRepository.delete',
          repository.delete(profileId, entryId),
        )
      }),
      list: Effect.fn('WeightService.list')(function* (profileId, clerkUserId, from, to) {
        yield* access.authorize(profileId, clerkUserId)
        const entries = yield* fromRepository(
          'WeightRepository.list',
          repository.list(profileId, from, to),
        )
        return { entries: entries.map(toWeightLogEntry) }
      }),
      save: Effect.fn('WeightService.save')(function* (profileId, clerkUserId, input) {
        yield* access.authorize(profileId, clerkUserId)
        const entry = yield* fromRepository(
          'WeightRepository.save',
          repository.save(profileId, { ...input, measuredAt: new Date(input.measuredAt) }),
        )
        return toWeightLogEntry(entry)
      }),
    })
  }),
)
