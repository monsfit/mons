import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { KyselyApplicationRepository } from './application-repository.js'
import { KyselyCatalogReader } from './catalog-repository.js'
import { createDatabase } from './client.js'
import { migrateApplicationDatabase } from './migrations.js'

const databaseUrl = process.env.REGOLITH_TEST_DATABASE_URL
const connectionString =
  databaseUrl ?? 'postgresql://regolith:regolith_local@localhost:5432/regolith'
const integration = databaseUrl === undefined ? describe.skip : describe
const schema = 'regolith_kysely_test'
const appSchema = 'regolith_app_test'

integration('KyselyCatalogReader with PostgreSQL', () => {
  const pool = new Pool({ connectionString })
  const database = createDatabase({ connectionString })
  const catalog = new KyselyCatalogReader(database, schema)
  const application = new KyselyApplicationRepository(database, {
    appSchema,
    catalogSchema: schema,
    now: () => new Date('2026-08-04T12:00:00Z'),
  })

  beforeAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
    await pool.query(`DROP SCHEMA IF EXISTS ${appSchema} CASCADE`)
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
        carbohydrates_available double precision,
        carbohydrates_total double precision,
        dataset_kind text NOT NULL,
        food_id bigint PRIMARY KEY,
        gtin char(14),
        ingestion_run_id uuid NOT NULL,
        name text NOT NULL,
        protein double precision,
        source text NOT NULL,
        source_id text NOT NULL,
        total_fat double precision
        ,search_document tsvector GENERATED ALWAYS AS (
          setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
          setweight(to_tsvector('simple', coalesce(brand, '')), 'B')
        ) STORED
      );
      CREATE INDEX foods_search_document_idx ON ${schema}.foods USING gin (search_document);
      CREATE VIEW ${schema}.branded_foods AS
        SELECT * FROM ${schema}.foods WHERE dataset_kind = 'branded';
      CREATE TABLE ${schema}.portions (
        amount double precision NOT NULL,
        dataset_kind text NOT NULL,
        food_id bigint NOT NULL,
        name text NOT NULL,
        ordinal integer NOT NULL,
        unit text NOT NULL,
        PRIMARY KEY (dataset_kind, food_id, ordinal)
      );
    `)
    await pool.query(
      `INSERT INTO ${schema}.ingestion_runs VALUES
        ('00000000-0000-0000-0000-000000000001', '2.0.0', '0.2.0',
         '2026-01-01T00:00:00Z', '2026-01-01T00:01:00Z', '{}'::jsonb, '{}'::jsonb,
         2, 5, 'success')`,
    )
    await pool.query(`INSERT INTO ${schema}.foods
      (brand, calories, carbohydrates_total, dataset_kind, food_id, gtin,
       ingestion_run_id, name, protein, source, source_id, total_fat)
      VALUES
      ('Example', 52, 14, 'branded', 1, '00000000000001',
       '00000000-0000-0000-0000-000000000001', 'Apple', 0.3, 'fixture', 'b-1', 0.2),
      ('Example', 237, 34, 'branded', 2, '00000000000002',
       '00000000-0000-0000-0000-000000000001', 'Apple Pie', 2.4, 'fixture', 'b-2', 11),
      (NULL, 57, 15, 'raw', 3, NULL,
       '00000000-0000-0000-0000-000000000001', 'Raw Apple', 0.3, 'fixture', 'r-1', 0.1),
      ('Broken', NULL, NULL, 'branded', 4, '00000000000004',
       '00000000-0000-0000-0000-000000000001', 'Broken Food', NULL, 'open_food_facts', 'bad-1', NULL),
      ('USDA', 90, 0.4, 'branded', 5, '00000000000005',
       '00000000-0000-0000-0000-000000000001', 'Egg Fried', 6.3, 'usda_fooddata_central_branded', 'usda-1', 6.8),
      ('OFF', 90, 0.4, 'branded', 6, '00000000000006',
       '00000000-0000-0000-0000-000000000001', 'Egg Fried', 6.3, 'open_food_facts', 'off-1', 6.8),
      (NULL, 295, NULL, 'raw', 7, NULL,
       '00000000-0000-0000-0000-000000000001', 'Cardamom Seed', 10.8, 'australian_food_composition', 'au-1', 6.7)
    `)
    await pool.query(`UPDATE ${schema}.foods SET carbohydrates_available = 40 WHERE food_id = 7`)
    await pool.query(`INSERT INTO ${schema}.portions
      (amount, dataset_kind, food_id, name, ordinal, unit)
      VALUES
      (182, 'branded', 1, '1 medium apple', 0, 'g'),
      (30, 'branded', 1, '1 cup, sliced', 1, 'g'),
      (15, 'raw', 3, '1 slice', 0, 'g')
    `)
    await migrateApplicationDatabase(database, appSchema)
  })

  afterAll(async () => {
    await database.destroy()
    await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
    await pool.query(`DROP SCHEMA IF EXISTS ${appSchema} CASCADE`)
    await pool.end()
  })

  test('reports the latest successful catalog and dataset counts', async () => {
    await expect(catalog.getStatus()).resolves.toMatchObject({
      active: true,
      brandedFoods: 5,
      rawFoods: 2,
      schemaVersion: '2.0.0',
      snapshotId: '00000000-0000-0000-0000-000000000001',
    })
  })

  test('finds a branded food by normalized GTIN', async () => {
    await expect(catalog.findByGtin('00000000000001')).resolves.toMatchObject({
      food_id: '1',
      name: 'Apple',
      portions: [
        { amount: 182, name: '1 medium apple', unit: 'g' },
        { amount: 30, name: '1 cup, sliced', unit: 'g' },
      ],
    })
  })

  test('searches deterministically and filters by dataset kind', async () => {
    const foods = await catalog.search({ kind: 'raw', limit: 10, query: 'apple' })
    expect(foods.map((food) => food.food_id)).toEqual(['3'])
    expect(foods[0]?.portions).toEqual([{ amount: 15, name: '1 slice', unit: 'g' }])
  })

  test('uses available carbohydrates when a raw source has no total value', async () => {
    const foods = await catalog.search({ kind: 'raw', limit: 10, query: 'cardamom' })
    expect(foods).toHaveLength(1)
    expect(foods[0]?.carbohydrates_total).toBe(40)
  })

  test('excludes incomplete food records from search and barcode lookup', async () => {
    await expect(catalog.search({ kind: 'branded', limit: 10, query: 'broken' })).resolves.toEqual(
      [],
    )
    await expect(catalog.findByGtin('00000000000004')).resolves.toBeUndefined()
  })

  test('prioritizes USDA branded foods ahead of Open Food Facts ties', async () => {
    const foods = await catalog.search({ kind: 'branded', limit: 10, query: 'egg fried' })
    expect(foods.map((food) => food.food_id)).toEqual(['5', '6'])
  })

  test('snapshots food nutrition into a persistent food log', async () => {
    const profileId = '00000000-0000-4000-8000-000000000001'
    const entry = await application.saveFoodLogEntry(profileId, {
      datasetKind: 'branded',
      entryId: '00000000-0000-4000-8000-000000000002',
      foodId: '1',
      loggedAt: new Date('2026-08-04T12:00:00Z'),
      mealCategory: 'lunch',
      quantityGrams: 150,
    })
    expect(entry).toMatchObject({
      calories_per_100g: 52,
      carbohydrates_per_100g: 14,
      name: 'Apple',
      quantity_grams: 150,
    })
    await expect(
      application.listFoodLog(
        profileId,
        new Date('2026-08-04T00:00:00Z'),
        new Date('2026-08-05T00:00:00Z'),
      ),
    ).resolves.toHaveLength(1)
  })

  test('calculates and persists an onboarding nutrition plan', async () => {
    const profileId = '00000000-0000-4000-8000-000000000001'
    const plan = await application.saveNutritionPlan(profileId, {
      birthDate: '1998-02-18',
      currentWeightKg: 56.7,
      dailyActivity: 'mostly_sedentary',
      exerciseFrequency: 'none',
      heightCm: 160,
      metabolicSex: 'female',
      targetWeightKg: 52,
      weeklyWeightChangePercent: 0.5,
      weightGoal: 'lose',
    })

    expect(plan).toMatchObject({
      calorie_target_kcal: 1_460,
      estimated_expenditure_kcal: 1_772,
      resting_energy_kcal: 1_266,
    })
    await expect(application.getNutritionPlan(profileId)).resolves.toMatchObject({
      weight_goal: 'lose',
    })
  })

  test('persists and orders canonical weight entries', async () => {
    const profileId = '00000000-0000-4000-8000-000000000001'
    await application.saveWeightLogEntry(profileId, {
      entryId: '00000000-0000-4000-8000-000000000031',
      measuredAt: new Date('2026-08-03T11:00:00Z'),
      weightKg: 56.9,
    })
    await application.saveWeightLogEntry(profileId, {
      entryId: '00000000-0000-4000-8000-000000000030',
      measuredAt: new Date('2026-08-04T11:00:00Z'),
      weightKg: 56.7,
    })

    const entries = await application.listWeightLog(
      profileId,
      new Date('2026-08-01T00:00:00Z'),
      new Date('2026-09-01T00:00:00Z'),
    )
    expect(entries.map((entry) => entry.weight_kg)).toEqual([56.9, 56.7])
    await expect(
      application.deleteWeightLogEntry(profileId, '00000000-0000-4000-8000-000000000031'),
    ).resolves.toBe(true)
  })

  test('persists workouts and replaces their ordered sets atomically', async () => {
    const profileId = '00000000-0000-4000-8000-000000000001'
    const sessionId = '00000000-0000-4000-8000-000000000010'
    await application.saveWorkout(profileId, {
      completedAt: new Date('2026-08-04T14:00:00Z'),
      distanceKilometers: null,
      durationMinutes: 60,
      kind: 'strength',
      sessionId,
      sets: [
        {
          detail: '8 reps',
          setId: '00000000-0000-4000-8000-000000000011',
          title: 'Bench Press',
          value: '80 kg',
        },
      ],
      startedAt: new Date('2026-08-04T13:00:00Z'),
      title: 'Upper Body',
    })
    const workouts = await application.listWorkouts(
      profileId,
      new Date('2026-08-01T00:00:00Z'),
      new Date('2026-09-01T00:00:00Z'),
    )
    expect(workouts).toHaveLength(1)
    expect(workouts[0]?.sets.map((set) => set.title)).toEqual(['Bench Press'])
  })
})
