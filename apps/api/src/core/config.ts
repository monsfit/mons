import { Config, Effect, Option, Schema } from 'effect'

import { aiGatewayModelConfig } from '../infrastructure/ai/gateway.ts'
import {
  mealObservationModelConfig,
  mealResolutionModelConfig,
  mealTranscriptionModelConfig,
} from '../features/meals.ts'
import { r2Config, type R2Config } from '../infrastructure/storage/r2-storage.ts'

export interface ApiConfig {
  readonly aiModel: string
  readonly mealObservationModel: string
  readonly mealResolutionModel: string
  readonly mealTranscriptionModel: string
  readonly appSchema: string
  readonly clerkPublishableKey: string
  readonly clerkSecretKey: string
  readonly databaseUrl: string
  readonly host: string
  readonly port: number
  readonly r2: Option.Option<R2Config>
  readonly schema: string
}

const schemaName = Schema.String.check(Schema.isPattern(/^[a-z_][a-z0-9_]{0,31}$/))

const decodeSchemaName = (name: string, value: string) =>
  Schema.decodeUnknownEffect(schemaName)(value).pipe(
    Effect.mapError(() => new Error(`${name} must be a safe lowercase PostgreSQL identifier`)),
  )

export const loadConfig = Effect.gen(function* () {
  const port = yield* Config.int('API_PORT').pipe(Config.withDefault(3000))
  if (port < 1 || port > 65_535) {
    return yield* Effect.fail(new Error('API_PORT must be an integer between 1 and 65535'))
  }
  const schema = yield* Config.string('REGOLITH_SCHEMA').pipe(Config.withDefault('regolith'))
  const appSchema = yield* Config.string('REGOLITH_APP_SCHEMA').pipe(
    Config.withDefault('regolith_app'),
  )
  return {
    aiModel: yield* aiGatewayModelConfig,
    mealObservationModel: yield* mealObservationModelConfig,
    mealResolutionModel: yield* mealResolutionModelConfig,
    mealTranscriptionModel: yield* mealTranscriptionModelConfig,
    appSchema: yield* decodeSchemaName('REGOLITH_APP_SCHEMA', appSchema),
    clerkPublishableKey: yield* Config.nonEmptyString('CLERK_PUBLISHABLE_KEY'),
    clerkSecretKey: yield* Config.nonEmptyString('CLERK_SECRET_KEY'),
    databaseUrl: yield* Config.string('DATABASE_URL').pipe(
      Config.withDefault('postgresql://regolith:regolith_local@localhost:5432/regolith'),
    ),
    host: yield* Config.nonEmptyString('API_HOST').pipe(Config.withDefault('0.0.0.0')),
    port,
    r2: yield* Config.option(r2Config),
    schema: yield* decodeSchemaName('REGOLITH_SCHEMA', schema),
  } satisfies ApiConfig
})
