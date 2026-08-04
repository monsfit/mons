import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { KyselyCatalogReader } from './catalog-repository.js'
import { createDatabase } from './client.js'

const databaseUrl = process.env.REGOLITH_TEST_DATABASE_URL
const connectionString =
  databaseUrl ?? 'postgresql://regolith:regolith_local@localhost:5432/regolith'
const integration = databaseUrl === undefined ? describe.skip : describe
const schema = 'regolith_kysely_test'

integration('KyselyCatalogReader with PostgreSQL', () => {
  const pool = new Pool({ connectionString })
  const database = createDatabase({ connectionString })
  const catalog = new KyselyCatalogReader(database, schema)

  beforeAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
    await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm')
    await pool.query(`
      CREATE SCHEMA ${schema};
      CREATE TABLE ${schema}.ingestion_runs (
        run_id uuid PRIMARY KEY,
        schema_version text NOT NULL,
        package_version text NOT NULL,
        started_at timestamptz NOT NULL,
        completed_at timestamptz,
        raw_manifest jsonb NOT NULL,
        branded_manifest jsonb NOT NULL,
        raw_rows bigint NOT NULL,
        branded_rows bigint NOT NULL,
        status text NOT NULL
      );
      CREATE TABLE ${schema}.foods (
        brand text,
        calories double precision,
        dataset_kind text NOT NULL,
        food_id bigint PRIMARY KEY,
        gtin char(14),
        ingestion_run_id uuid NOT NULL,
        name text NOT NULL,
        protein double precision,
        source text NOT NULL,
        source_id text NOT NULL,
        total_fat double precision
      );
      CREATE VIEW ${schema}.branded_foods AS
        SELECT * FROM ${schema}.foods WHERE dataset_kind = 'branded';
    `)
    await pool.query(
      `INSERT INTO ${schema}.ingestion_runs VALUES
        ('00000000-0000-0000-0000-000000000001', '2.0.0', '0.2.0',
         '2026-01-01T00:00:00Z', '2026-01-01T00:01:00Z', '{}'::jsonb, '{}'::jsonb,
         1, 2, 'success')`,
    )
    await pool.query(`INSERT INTO ${schema}.foods VALUES
      ('Example', 52, 'branded', 1, '00000000000001',
       '00000000-0000-0000-0000-000000000001', 'Apple', 0.3, 'fixture', 'b-1', 0.2),
      ('Example', 237, 'branded', 2, '00000000000002',
       '00000000-0000-0000-0000-000000000001', 'Apple Pie', 2.4, 'fixture', 'b-2', 11),
      (NULL, 57, 'raw', 3, NULL,
       '00000000-0000-0000-0000-000000000001', 'Raw Apple', 0.3, 'fixture', 'r-1', 0.1)
    `)
  })

  afterAll(async () => {
    await database.destroy()
    await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
    await pool.end()
  })

  test('reports the latest successful catalog and dataset counts', async () => {
    await expect(catalog.getStatus()).resolves.toMatchObject({
      active: true,
      brandedFoods: 2,
      rawFoods: 1,
      schemaVersion: '2.0.0',
      snapshotId: '00000000-0000-0000-0000-000000000001',
    })
  })

  test('finds a branded food by normalized GTIN', async () => {
    await expect(catalog.findByGtin('00000000000001')).resolves.toMatchObject({
      food_id: '1',
      name: 'Apple',
    })
  })

  test('searches deterministically and filters by dataset kind', async () => {
    const foods = await catalog.search({ kind: 'raw', limit: 10, query: 'apple' })
    expect(foods.map((food) => food.food_id)).toEqual(['3'])
  })
})
