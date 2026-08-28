import { Effect, Schema } from 'effect'
import { Migrator, SqlClient } from 'effect/unstable/sql'

import { up as initialApplication } from './migrations/001_initial_application.ts'
import { up as clerkIdentity } from './migrations/002_clerk_identity.ts'
import { up as workoutTemplates } from './migrations/003_workout_templates.ts'
import { up as userFoodsAndRecipes } from './migrations/004_user_foods_and_recipes.ts'
import { up as structuredRecipeIngredients } from './migrations/005_structured_recipe_ingredients.ts'
import { up as mealEstimates } from './migrations/006_meal_estimates.ts'
import { up as mealLogs } from './migrations/007_meal_logs.ts'
import { up as mealMediaCleanup } from './migrations/008_meal_media_cleanup.ts'

const schemaNameSchema = Schema.String.check(Schema.isPattern(/^[a-z_][a-z0-9_]{0,31}$/)).annotate({
  identifier: 'PostgreSQLSchemaName',
})

export const validateSchemaName = Schema.decodeUnknownEffect(schemaNameSchema)

export const grantRuntimeDatabaseAccess = (runtimeRole: string, appSchema = 'mons_app') =>
  Effect.gen(function* () {
    const safeRole = yield* validateSchemaName(runtimeRole)
    const safeAppSchema = yield* validateSchemaName(appSchema)
    const sql = yield* SqlClient.SqlClient
    const role = sql(safeRole)
    const application = sql(safeAppSchema)

    yield* sql`GRANT USAGE ON SCHEMA ${application} TO ${role}`
    yield* sql`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${application} TO ${role}`
    yield* sql`GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA ${application} TO ${role}`
    yield* sql`ALTER DEFAULT PRIVILEGES IN SCHEMA ${application}
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role}`
    yield* sql`ALTER DEFAULT PRIVILEGES IN SCHEMA ${application}
      GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${role}`
  }).pipe(
    Effect.withSpan('database.grant-runtime-access', {
      attributes: { 'db.runtime_role': runtimeRole },
    }),
  )

const applicationMigrationLoader = (schema: string): Migrator.Loader =>
  Effect.succeed([
    [1, 'initial_application', Effect.succeed(initialApplication(schema))],
    [2, 'clerk_identity', Effect.succeed(clerkIdentity(schema))],
    [3, 'workout_templates', Effect.succeed(workoutTemplates(schema))],
    [4, 'user_foods_and_recipes', Effect.succeed(userFoodsAndRecipes(schema))],
    [5, 'structured_recipe_ingredients', Effect.succeed(structuredRecipeIngredients(schema))],
    [6, 'meal_estimates', Effect.succeed(mealEstimates(schema))],
    [7, 'meal_logs', Effect.succeed(mealLogs(schema))],
    [8, 'meal_media_cleanup', Effect.succeed(mealMediaCleanup(schema))],
  ])

export const migrateApplicationDatabase = (schema = 'mons_app') =>
  Effect.gen(function* () {
    const safeSchema = yield* validateSchemaName(schema)
    const sql = yield* SqlClient.SqlClient
    yield* sql`CREATE SCHEMA IF NOT EXISTS ${sql(safeSchema)}`
    return yield* Migrator.make({})({
      loader: applicationMigrationLoader(safeSchema),
      table: `${safeSchema}.effect_sql_migrations`,
    })
  }).pipe(
    Effect.withSpan('database.migrate.application', {
      attributes: { 'db.namespace': schema },
    }),
  )
