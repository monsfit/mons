import { NodeRuntime } from '@effect/platform-node'
import { Config, Effect, Option } from 'effect'

import { createDatabaseLayer } from './client.ts'
import {
  grantRuntimeDatabaseAccess,
  migrateApplicationDatabase,
  migrateCatalogSearch,
} from './migrations.ts'

const program = Effect.gen(function* () {
  const databaseUrl = yield* Config.string('DATABASE_URL').pipe(
    Config.withDefault('postgresql://mons:mons_local@localhost:5432/mons'),
  )
  const appSchema = yield* Config.string('MONS_APP_SCHEMA').pipe(Config.withDefault('mons_app'))
  const catalogSchema = yield* Config.string('MONS_SCHEMA').pipe(Config.withDefault('mons'))
  const runtimeRole = yield* Config.option(Config.nonEmptyString('MONS_DATABASE_RUNTIME_USER'))
  const database = createDatabaseLayer({ connectionString: databaseUrl })

  yield* Effect.gen(function* () {
    const migrations = yield* migrateApplicationDatabase(appSchema)
    const catalogAvailable = yield* migrateCatalogSearch(catalogSchema)
    if (Option.isSome(runtimeRole)) {
      yield* grantRuntimeDatabaseAccess(runtimeRole.value, appSchema, catalogSchema)
    }
    yield* Effect.logInfo('Mons database migration complete', {
      applicationMigrations: migrations.length,
      catalogAvailable,
      runtimeAccessGranted: Option.isSome(runtimeRole),
    })
  }).pipe(Effect.provide(database))
})

NodeRuntime.runMain(program)
