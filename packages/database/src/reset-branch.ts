import { NodeRuntime } from '@effect/platform-node'
import { Config, Effect, Option } from 'effect'
import { SqlClient } from 'effect/unstable/sql'
import { execFileSync } from 'node:child_process'

import { appSchemaFromBranchId, branchIdFromName, isProtectedBranch } from './deployment.ts'
import { createDatabaseLayer } from './client.ts'
import { grantRuntimeDatabaseAccess, migrateApplicationDatabase } from './migrations.ts'

const argument = (name: string) => {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

const currentBranch = () => {
  const supplied =
    argument('--branch') ?? process.env.GITHUB_HEAD_REF ?? process.env.GITHUB_REF_NAME
  if (supplied) return supplied
  return execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim()
}

const branch = currentBranch()
if (isProtectedBranch(branch)) {
  throw new Error(`Refusing to reset a canonical branch: ${branch || '(detached HEAD)'}`)
}

const appSchema = appSchemaFromBranchId(branchIdFromName(branch))
const dropOnly = process.argv.includes('--drop-only')

const program = Effect.gen(function* () {
  const databaseUrl = yield* Config.string('MIGRATION_DATABASE_URL').pipe(
    Config.orElse(() => Config.string('DATABASE_URL')),
  )
  const runtimeRole = yield* Config.option(Config.nonEmptyString('MONS_DATABASE_RUNTIME_USER'))
  const database = createDatabaseLayer({ connectionString: databaseUrl })

  yield* Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    yield* sql`DROP SCHEMA IF EXISTS ${sql(appSchema)} CASCADE`
    if (!dropOnly) {
      yield* migrateApplicationDatabase(appSchema)
      if (Option.isSome(runtimeRole)) {
        yield* grantRuntimeDatabaseAccess(runtimeRole.value, appSchema, 'mons_catalog')
      }
    }
    yield* Effect.logInfo(dropOnly ? 'Mons branch schema dropped' : 'Mons branch schema reset', {
      appSchema,
      branch,
    })
  }).pipe(Effect.provide(database))
})

NodeRuntime.runMain(program)
