import { NodeRuntime } from '@effect/platform-node'
import { Config, Effect } from 'effect'

import { createDatabaseLayer } from './client.ts'
import { migrateApplicationDatabase, migrateCatalogSearch } from './migrations.ts'

const program = Effect.gen(function* () {
  const databaseUrl = yield* Config.string('DATABASE_URL').pipe(
    Config.withDefault('postgresql://regolith:regolith_local@localhost:5432/regolith'),
  )
  const appSchema = yield* Config.string('REGOLITH_APP_SCHEMA').pipe(
    Config.withDefault('regolith_app'),
  )
  const catalogSchema = yield* Config.string('REGOLITH_SCHEMA').pipe(Config.withDefault('regolith'))
  const database = createDatabaseLayer({ connectionString: databaseUrl })

  yield* Effect.gen(function* () {
    const migrations = yield* migrateApplicationDatabase(appSchema)
    const catalogAvailable = yield* migrateCatalogSearch(catalogSchema)
    yield* Effect.logInfo('Regolith database migration complete', {
      applicationMigrations: migrations.length,
      catalogAvailable,
    })
  }).pipe(Effect.provide(database))
})

NodeRuntime.runMain(program)
