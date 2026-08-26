import type { RegolithApi } from '../api.ts'
import { ServiceUnavailableError } from '../core/errors.ts'
import { fromSystemService } from '../core/handler-errors.ts'
import { SystemUnavailable } from '../core/service-errors.ts'
import { healthSchema } from '@regolith/contracts'
import { DatabaseHealth } from '@regolith/database'
import { Context, Effect, Layer } from 'effect'
import { HttpApiBuilder, HttpApiEndpoint, HttpApiGroup } from 'effect/unstable/httpapi'

export const systemApi = HttpApiGroup.make('system').add(
  HttpApiEndpoint.get('health', '/health', {
    success: healthSchema,
    error: ServiceUnavailableError,
  }),
)

export const systemHandlers = (api: typeof RegolithApi) =>
  HttpApiBuilder.group(api, 'system', (handlers) =>
    handlers.handle('health', () =>
      Effect.gen(function* () {
        const system = yield* SystemService
        return yield* fromSystemService(system.health)
      }),
    ),
  )

export interface SystemServiceShape {
  readonly health: Effect.Effect<
    { readonly service: 'api'; readonly status: 'ok'; readonly version: string },
    SystemUnavailable
  >
}

export const SystemService = Context.Service<SystemServiceShape>('@regolith/api/SystemService')

export const systemServiceLayer = Layer.effect(
  SystemService,
  Effect.gen(function* () {
    const database = yield* DatabaseHealth
    return SystemService.of({
      health: database.check.pipe(
        Effect.tapError((error) => Effect.logError('Database health check failed', error)),
        Effect.mapError(() => new SystemUnavailable()),
        Effect.as({ service: 'api' as const, status: 'ok' as const, version: '0.1.0' }),
      ),
    })
  }),
)
