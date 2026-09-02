import { NodeRuntime } from '@effect/platform-node'
import { Config, Effect, Option } from 'effect'
import { SqlClient } from 'effect/unstable/sql'

import { replaceCatalogWithFixture } from './catalog-fixture.ts'
import { createDatabaseLayer } from './core/client.ts'
import { validateSchemaName } from './migrations.ts'

const program = Effect.gen(function* () {
  const databaseUrl = yield* Config.string('MIGRATION_DATABASE_URL').pipe(
    Config.orElse(() => Config.string('DATABASE_URL')),
  )
  const schema = yield* Config.string('MONS_CATALOG_SCHEMA').pipe(
    Config.withDefault('mons_catalog_sample'),
  )
  const runtimeRole = yield* Config.option(Config.nonEmptyString('MONS_DATABASE_RUNTIME_USER'))
  const database = createDatabaseLayer({ connectionString: databaseUrl })

  yield* Effect.gen(function* () {
    yield* replaceCatalogWithFixture(schema)
    if (Option.isSome(runtimeRole)) {
      const sql = yield* SqlClient.SqlClient
      const safeSchema = yield* validateSchemaName(schema)
      const safeRole = yield* validateSchemaName(runtimeRole.value)
      yield* sql`GRANT USAGE ON SCHEMA ${sql(safeSchema)} TO ${sql(safeRole)}`
      yield* sql`GRANT SELECT ON ALL TABLES IN SCHEMA ${sql(safeSchema)} TO ${sql(safeRole)}`
    }
    yield* Effect.logInfo('Mons sample catalog installed', { schema })
  }).pipe(Effect.provide(database))
})

NodeRuntime.runMain(program)
