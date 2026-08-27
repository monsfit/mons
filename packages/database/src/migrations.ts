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

const renameSchema = (from: string, to: string) =>
  Effect.gen(function* () {
    const safeFrom = yield* validateSchemaName(from)
    const safeTo = yield* validateSchemaName(to)
    const sql = yield* SqlClient.SqlClient
    const schemas = yield* sql<{ readonly name: string }>`
      SELECT nspname AS name
      FROM pg_namespace
      WHERE nspname IN (${safeFrom}, ${safeTo})
    `
    const names = new Set(schemas.map(({ name }) => name))
    if (names.has(safeFrom) && names.has(safeTo)) {
      return yield* Effect.fail(
        new Error(`Cannot rename ${safeFrom}: both ${safeFrom} and ${safeTo} exist`),
      )
    }
    if (names.has(safeFrom)) {
      yield* sql`ALTER SCHEMA ${sql(safeFrom)} RENAME TO ${sql(safeTo)}`
      return true
    }
    return false
  })

/** One-time, data-preserving adoption of the Mons canonical schema names. */
export const adoptMonsSchemaNames = Effect.gen(function* () {
  const applicationRenamed = yield* renameSchema('regolith_app', 'mons_app')
  const catalogRenamed = yield* renameSchema('regolith', 'mons_catalog')
  return { applicationRenamed, catalogRenamed }
})

export const grantRuntimeDatabaseAccess = (
  runtimeRole: string,
  appSchema = 'mons_app',
  catalogSchema = 'mons_catalog',
) =>
  Effect.gen(function* () {
    const safeRole = yield* validateSchemaName(runtimeRole)
    const safeAppSchema = yield* validateSchemaName(appSchema)
    const safeCatalogSchema = yield* validateSchemaName(catalogSchema)
    const sql = yield* SqlClient.SqlClient
    const role = sql(safeRole)
    const application = sql(safeAppSchema)
    const catalog = sql(safeCatalogSchema)

    yield* sql`GRANT USAGE ON SCHEMA ${application} TO ${role}`
    yield* sql`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${application} TO ${role}`
    yield* sql`GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA ${application} TO ${role}`
    yield* sql`ALTER DEFAULT PRIVILEGES IN SCHEMA ${application}
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role}`
    yield* sql`ALTER DEFAULT PRIVILEGES IN SCHEMA ${application}
      GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${role}`

    const catalogExists = yield* sql<{ readonly exists: boolean }>`
      SELECT EXISTS (SELECT FROM pg_namespace WHERE nspname = ${safeCatalogSchema}) AS exists
    `
    if (catalogExists[0]?.exists === true) {
      yield* sql`GRANT USAGE ON SCHEMA ${catalog} TO ${role}`
      yield* sql`GRANT SELECT ON ALL TABLES IN SCHEMA ${catalog} TO ${role}`
    }
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

export const migrateCatalogSearch = (schema = 'mons_catalog') =>
  Effect.gen(function* () {
    const safeSchema = yield* validateSchemaName(schema)
    const sql = yield* SqlClient.SqlClient
    const foods = sql(`${safeSchema}.foods`)
    const rawFoods = sql(`${safeSchema}.raw_foods`)
    const brandedFoods = sql(`${safeSchema}.branded_foods`)

    const catalog = yield* sql<{ readonly exists: boolean }>`
      SELECT to_regclass(${`${safeSchema}.foods`}) IS NOT NULL AS exists
    `
    if (catalog[0]?.exists !== true) return false

    yield* sql`CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public`

    const columns = yield* sql<{ readonly exists: boolean }>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = ${safeSchema}
          AND table_name = 'foods'
          AND column_name = 'search_document'
      ) AS exists
    `
    let changed = false
    if (columns[0]?.exists !== true) {
      yield* sql`ALTER TABLE ${foods}
        ADD COLUMN search_document tsvector GENERATED ALWAYS AS (
          setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
          setweight(to_tsvector('simple', coalesce(brand, '')), 'B')
        ) STORED`
      changed = true
    }

    const indexes = yield* sql<{ readonly indexname: string }>`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = ${safeSchema}
        AND indexname IN (
          'raw_foods_search_document_idx',
          'branded_foods_search_document_idx',
          'raw_foods_name_trgm_idx',
          'branded_foods_name_trgm_idx',
          'branded_foods_brand_trgm_idx'
        )
    `
    const names = new Set(indexes.map((row) => row.indexname))
    if (!names.has('raw_foods_search_document_idx')) {
      yield* sql`CREATE INDEX raw_foods_search_document_idx
        ON ${rawFoods} USING gin (search_document)`
      changed = true
    }
    if (!names.has('branded_foods_search_document_idx')) {
      yield* sql`CREATE INDEX branded_foods_search_document_idx
        ON ${brandedFoods} USING gin (search_document)`
      changed = true
    }
    if (!names.has('raw_foods_name_trgm_idx')) {
      yield* sql`CREATE INDEX raw_foods_name_trgm_idx
        ON ${rawFoods} USING gin (name gin_trgm_ops)`
      changed = true
    }
    if (!names.has('branded_foods_name_trgm_idx')) {
      yield* sql`CREATE INDEX branded_foods_name_trgm_idx
        ON ${brandedFoods} USING gin (name gin_trgm_ops)`
      changed = true
    }
    if (!names.has('branded_foods_brand_trgm_idx')) {
      yield* sql`CREATE INDEX branded_foods_brand_trgm_idx
        ON ${brandedFoods} USING gin (brand gin_trgm_ops)`
      changed = true
    }
    if (changed) yield* sql`ANALYZE ${foods}`
    return true
  }).pipe(
    Effect.withSpan('database.migrate.catalog-search', {
      attributes: { 'db.namespace': schema },
    }),
  )
