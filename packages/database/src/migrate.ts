import { NodeRuntime } from '@effect/platform-node'
import { Config, Effect, Option } from 'effect'

import { createDatabaseLayer } from './core/client.ts'
import {
  grantRuntimeDatabaseAccess,
  migrateApplicationDatabase,
  migrateCatalogSearch,
} from './migrations.ts'

const program = Effect.gen(function* () {
  const databaseUrl = yield* Config.string('DATABASE_URL').pipe(
    Config.withDefault('postgresql://regolith:regolith_local@localhost:5432/regolith'),
  )
  const appSchema = yield* Config.string('REGOLITH_APP_SCHEMA').pipe(
    Config.withDefault('regolith_app'),
  )
  const catalogSchema = yield* Config.string('REGOLITH_SCHEMA').pipe(Config.withDefault('regolith'))
  const runtimeRole = yield* Config.option(Config.nonEmptyString('REGOLITH_DATABASE_RUNTIME_USER'))
  const database = createDatabaseLayer({ connectionString: databaseUrl })

  yield* Effect.gen(function* () {
    const migrations = yield* migrateApplicationDatabase(appSchema)
    const catalogAvailable = yield* migrateCatalogSearch(catalogSchema)
    if (Option.isSome(runtimeRole)) {
      yield* grantRuntimeDatabaseAccess(runtimeRole.value, appSchema, catalogSchema)
    }
    yield* Effect.logInfo('Regolith database migration complete', {
      applicationMigrations: migrations.length,
      catalogAvailable,
      runtimeAccessGranted: Option.isSome(runtimeRole),
    })
  }).pipe(Effect.provide(database))
})

NodeRuntime.runMain(program)
