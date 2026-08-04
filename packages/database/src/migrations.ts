import { promises as fileSystem } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { sql, type Kysely } from 'kysely'
import { FileMigrationProvider, Migrator } from 'kysely/migration'

import type { CatalogDatabase } from './types.js'

const schemaPattern = /^[a-z_][a-z0-9_]{0,31}$/

export function validateSchemaName(schema: string): string {
  if (!schemaPattern.test(schema)) {
    throw new Error('PostgreSQL schema must be a safe lowercase identifier')
  }
  return schema
}

export async function migrateApplicationDatabase(
  database: Kysely<CatalogDatabase>,
  schema = 'regolith_app',
): Promise<void> {
  const safeSchema = validateSchemaName(schema)
  await database.schema.createSchema(safeSchema).ifNotExists().execute()

  const migrator = new Migrator({
    db: database.withSchema(safeSchema),
    migrationTableSchema: safeSchema,
    provider: new FileMigrationProvider({
      fs: fileSystem,
      migrationFolder: fileURLToPath(new URL('./migrations', import.meta.url)),
      path,
    }),
  })
  const { error } = await migrator.migrateToLatest()
  if (error !== undefined) throw error
}

export async function migrateCatalogSearch(
  database: Kysely<CatalogDatabase>,
  schema = 'regolith',
): Promise<boolean> {
  const safeSchema = validateSchemaName(schema)
  const table = `"${safeSchema}"."foods"`
  const catalog = await sql<{ exists: boolean }>`
    select to_regclass(${`${safeSchema}.foods`}) is not null as exists
  `.execute(database)
  if (catalog.rows[0]?.exists !== true) {
    return false
  }

  const column = await sql<{ exists: boolean }>`
    select exists (
      select 1 from information_schema.columns
      where table_schema = ${safeSchema}
        and table_name = 'foods'
        and column_name = 'search_document'
    ) as exists
  `.execute(database)
  let changed = false
  if (column.rows[0]?.exists !== true) {
    await sql
      .raw(`
      ALTER TABLE ${table}
      ADD COLUMN search_document tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(brand, '')), 'B')
      ) STORED
    `)
      .execute(database)
    changed = true
  }

  const indexes = await sql<{ indexname: string }>`
    select indexname from pg_indexes
    where schemaname = ${safeSchema}
      and indexname in ('raw_foods_search_document_idx', 'branded_foods_search_document_idx')
  `.execute(database)
  const names = new Set(indexes.rows.map((row) => row.indexname))
  if (!names.has('raw_foods_search_document_idx')) {
    await sql
      .raw(
        `CREATE INDEX raw_foods_search_document_idx ON "${safeSchema}"."raw_foods" USING gin (search_document)`,
      )
      .execute(database)
    changed = true
  }
  if (!names.has('branded_foods_search_document_idx')) {
    await sql
      .raw(
        `CREATE INDEX branded_foods_search_document_idx ON "${safeSchema}"."branded_foods" USING gin (search_document)`,
      )
      .execute(database)
    changed = true
  }
  if (changed) {
    await sql.raw(`ANALYZE ${table}`).execute(database)
  }
  return true
}
