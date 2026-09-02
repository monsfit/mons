import { Effect } from 'effect'
import { SqlClient } from 'effect/unstable/sql'

import { validateSchemaName } from './migrations.ts'

const allowedFixtureSchema = (schema: string) =>
  schema.endsWith('_sample') || schema.endsWith('_test')

export const replaceCatalogWithFixture = (schema = 'mons_catalog_sample') =>
  Effect.gen(function* () {
    const safeSchema = yield* validateSchemaName(schema)
    if (!allowedFixtureSchema(safeSchema)) {
      return yield* Effect.fail(
        new Error('Catalog fixtures may only replace schemas ending in _sample or _test'),
      )
    }

    const sql = yield* SqlClient.SqlClient
    const catalog = sql(safeSchema)
    const foods = sql(`${safeSchema}.foods`)
    const rawFoods = sql(`${safeSchema}.raw_foods`)
    const brandedFoods = sql(`${safeSchema}.branded_foods`)
    const portions = sql(`${safeSchema}.portions`)
    const nutrients = sql(`${safeSchema}.nutrient_definitions`)
    const catalogMetadata = sql(`${safeSchema}.catalog_metadata`)

    yield* sql`DROP SCHEMA IF EXISTS ${catalog} CASCADE`
    yield* sql`CREATE SCHEMA ${catalog}`
    yield* sql`CREATE TABLE ${catalogMetadata} (
      release_id text PRIMARY KEY,
      schema_version text NOT NULL,
      built_at timestamptz NOT NULL,
      loaded_at timestamptz NOT NULL,
      raw_rows bigint NOT NULL,
      branded_rows bigint NOT NULL
    )`
    yield* sql`INSERT INTO ${catalogMetadata}
      (release_id, schema_version, built_at, loaded_at, raw_rows, branded_rows)
      VALUES ('sample-catalog-v1', 'sample', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 2, 3)`
    yield* sql`CREATE TABLE ${foods} (
      brand text,
      calories double precision,
      carbohydrates_available double precision,
      carbohydrates_total double precision,
      dataset_kind text NOT NULL,
      fiber double precision,
      food_id bigint NOT NULL,
      gtin char(14),
      name text NOT NULL,
      protein double precision,
      sodium double precision,
      source text NOT NULL,
      source_id text NOT NULL,
      total_fat double precision,
      search_document tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(brand, '')), 'B')
      ) STORED,
      PRIMARY KEY (dataset_kind, food_id)
    ) PARTITION BY LIST (dataset_kind)`
    yield* sql`CREATE TABLE ${rawFoods} PARTITION OF ${foods} FOR VALUES IN ('raw')`
    yield* sql`CREATE TABLE ${brandedFoods} PARTITION OF ${foods} FOR VALUES IN ('branded')`
    yield* sql`CREATE INDEX sample_raw_foods_search_idx ON ${rawFoods} USING gin (search_document)`
    yield* sql`CREATE INDEX sample_branded_foods_search_idx ON ${brandedFoods} USING gin (search_document)`
    yield* sql`CREATE INDEX sample_raw_foods_name_idx ON ${rawFoods} ((lower(name) COLLATE "C"), food_id)`
    yield* sql`CREATE INDEX sample_branded_foods_name_idx ON ${brandedFoods} ((lower(name) COLLATE "C"), food_id)`
    yield* sql`CREATE INDEX sample_branded_foods_brand_idx ON ${brandedFoods} ((lower(brand) COLLATE "C"), food_id)`
    yield* sql`CREATE TABLE ${portions} (
      amount double precision NOT NULL,
      dataset_kind text NOT NULL,
      food_id bigint NOT NULL,
      name text NOT NULL,
      ordinal integer NOT NULL,
      unit text NOT NULL,
      PRIMARY KEY (dataset_kind, food_id, ordinal)
    )`
    yield* sql`CREATE TABLE ${nutrients} (
      field_name text PRIMARY KEY,
      unit text NOT NULL,
      description text NOT NULL,
      value_kind text NOT NULL
    )`
    yield* sql`INSERT INTO ${foods}
      (brand, calories, carbohydrates_total, dataset_kind, fiber, food_id, gtin,
       name, protein, sodium, source, source_id, total_fat)
      VALUES
      (NULL, 52, 13.8, 'raw', 2.4, 1, NULL,
       'Sample Apple', 0.3, 1, 'mons_sample', 'raw-apple', 0.2),
      (NULL, 143, 0.7, 'raw', 0, 2, NULL,
       'Sample Egg', 12.6, 142, 'mons_sample', 'raw-egg', 9.5),
      ('Sample Pantry', 379, 67.7, 'branded', 10.1, 3, '00000000000003',
       'Sample Rolled Oats', 13.2, 6, 'mons_sample', 'branded-oats', 6.5),
      ('Sample Dairy', 61, 4.8, 'branded', 0, 4, '00000000000004',
       'Sample Whole Milk', 3.2, 43, 'mons_sample', 'branded-milk', 3.3),
      ('Sample Bakery', 265, 49, 'branded', 2.7, 5, '00000000000005',
       'Sample Bread', 9, 491, 'mons_sample', 'branded-bread', 3.2)`
    yield* sql`INSERT INTO ${nutrients} (field_name, unit, description, value_kind) VALUES
      ('calories', 'kcal', 'Food energy per 100 g', 'direct'),
      ('carbohydrates_total', 'g', 'Total carbohydrate per 100 g', 'direct'),
      ('fiber', 'g', 'Dietary fibre per 100 g', 'direct'),
      ('protein', 'g', 'Protein per 100 g', 'direct'),
      ('sodium', 'mg', 'Sodium per 100 g', 'direct'),
      ('total_fat', 'g', 'Total fat per 100 g', 'direct')`
    yield* sql`INSERT INTO ${portions} (amount, dataset_kind, food_id, name, ordinal, unit) VALUES
      (182, 'raw', 1, '1 medium apple', 0, 'g'),
      (50, 'raw', 2, '1 large egg', 0, 'g'),
      (40, 'branded', 3, '1/2 cup', 0, 'g'),
      (244, 'branded', 4, '1 cup', 0, 'g'),
      (28, 'branded', 5, '1 slice', 0, 'g')`
  })
