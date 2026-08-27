import { NodeRuntime } from '@effect/platform-node'
import { Config, Effect, Option } from 'effect'

import { createDatabaseLayer } from './client.ts'
import {
  adoptMonsSchemaNames,
  grantRuntimeDatabaseAccess,
  migrateApplicationDatabase,
  migrateCatalogSearch,
} from './migrations.ts'

const program = Effect.gen(function* () {
  const databaseUrl = yield* Config.string('MIGRATION_DATABASE_URL').pipe(
    Config.orElse(() => Config.string('DATABASE_URL')),
  )
  const appSchema = yield* Config.string('MONS_APP_SCHEMA').pipe(Config.withDefault('mons_app'))
  const catalogSchema = yield* Config.string('MONS_CATALOG_SCHEMA').pipe(
    Config.withDefault('mons_catalog'),
  )
  const runtimeRole = yield* Config.option(Config.nonEmptyString('MONS_DATABASE_RUNTIME_USER'))
  const database = createDatabaseLayer({ connectionString: databaseUrl })

  yield* Effect.gen(function* () {
    const adoptedSchemaNames =
      appSchema === 'mons_app'
        ? yield* adoptMonsSchemaNames
        : { applicationRenamed: false, catalogRenamed: false }
    const migrations = yield* migrateApplicationDatabase(appSchema)
    const catalogAvailable = yield* migrateCatalogSearch(catalogSchema)
    if (Option.isSome(runtimeRole)) {
      yield* grantRuntimeDatabaseAccess(runtimeRole.value, appSchema, catalogSchema)
    }
    yield* Effect.logInfo('Mons database migration complete', {
      applicationMigrations: migrations.length,
      adoptedSchemaNames,
      catalogAvailable,
      runtimeAccessGranted: Option.isSome(runtimeRole),
    })
  }).pipe(Effect.provide(database))
})

NodeRuntime.runMain(program)
