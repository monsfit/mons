import { NodeRuntime } from '@effect/platform-node'
import { Config, Effect, Option } from 'effect'

import { createDatabaseLayer } from './core/client.ts'
import { grantRuntimeDatabaseAccess, migrateApplicationDatabase } from './migrations.ts'

const program = Effect.gen(function* () {
  const databaseUrl = yield* Config.string('MIGRATION_DATABASE_URL').pipe(
    Config.orElse(() => Config.string('DATABASE_URL')),
  )
  const appSchema = yield* Config.string('MONS_APP_SCHEMA').pipe(Config.withDefault('mons_app'))
  const runtimeRole = yield* Config.option(Config.nonEmptyString('MONS_DATABASE_RUNTIME_USER'))
  const database = createDatabaseLayer({ connectionString: databaseUrl })

  yield* Effect.gen(function* () {
    const migrations = yield* migrateApplicationDatabase(appSchema)
    if (Option.isSome(runtimeRole)) {
      yield* grantRuntimeDatabaseAccess(runtimeRole.value, appSchema)
    }
    yield* Effect.logInfo('Mons database migration complete', {
      applicationMigrations: migrations.length,
      runtimeAccessGranted: Option.isSome(runtimeRole),
    })
  }).pipe(Effect.provide(database))
})

NodeRuntime.runMain(program)
