import { describe, expect, layer } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { SqlClient } from 'effect/unstable/sql'

import { ApplicationRepository, applicationRepositoryLayer } from './application-repository.ts'
import { CatalogReader, catalogReaderLayer } from './catalog-repository.ts'
import { createDatabaseLayer } from './client.ts'
import { MealEstimateRepository, mealEstimateRepositoryLayer } from './meal-estimate-repository.ts'
import { MealLogRepository, mealLogRepositoryLayer } from './meal-log-repository.ts'
import { migrateApplicationDatabase } from './migrations.ts'
import { UserFoodRepository, userFoodRepositoryLayer } from './user-food-repository.ts'

const databaseUrl = process.env.MONS_TEST_DATABASE_URL
const integration = databaseUrl === undefined ? describe.skip : describe
const schema = 'mons_catalog_effect_test'
const appSchema = 'mons_app_effect_test'

const fixtureLayer = Layer.effectDiscard(
  Effect.acquireRelease(
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const catalog = sql(schema)
      const application = sql(appSchema)
      const foods = sql(`${schema}.foods`)
      const portions = sql(`${schema}.portions`)
      const nutrients = sql(`${schema}.nutrient_definitions`)
      const runs = sql(`${schema}.ingestion_runs`)
      yield* sql`DROP SCHEMA IF EXISTS ${catalog} CASCADE`
      yield* sql`DROP SCHEMA IF EXISTS ${application} CASCADE`
      yield* sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`
      yield* sql`CREATE SCHEMA ${catalog}`
      yield* sql`CREATE TABLE ${runs} (
        run_id uuid PRIMARY KEY, schema_version text NOT NULL, package_version text NOT NULL,
        started_at timestamptz NOT NULL, completed_at timestamptz,
        raw_manifest jsonb NOT NULL, branded_manifest jsonb NOT NULL,
        raw_rows bigint NOT NULL, branded_rows bigint NOT NULL, status text NOT NULL
      )`
      yield* sql`CREATE TABLE ${foods} (
        brand text, calories double precision, carbohydrates_available double precision,
        carbohydrates_total double precision, dataset_kind text NOT NULL, food_id bigint PRIMARY KEY,
        fiber double precision, gtin char(14), ingestion_run_id uuid NOT NULL, name text NOT NULL,
        protein double precision, source text NOT NULL, source_id text NOT NULL,
        sodium double precision, total_fat double precision,
        search_document tsvector GENERATED ALWAYS AS (
          setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
          setweight(to_tsvector('simple', coalesce(brand, '')), 'B')
        ) STORED
      )`
      yield* sql`CREATE INDEX foods_search_document_idx ON ${foods} USING gin (search_document)`
      yield* sql`CREATE VIEW ${sql(`${schema}.branded_foods`)} AS
        SELECT * FROM ${foods} WHERE dataset_kind = 'branded'`
      yield* sql`CREATE TABLE ${portions} (
        amount double precision NOT NULL, dataset_kind text NOT NULL, food_id bigint NOT NULL,
        name text NOT NULL, ordinal integer NOT NULL, unit text NOT NULL,
        PRIMARY KEY (dataset_kind, food_id, ordinal)
      )`
      yield* sql`CREATE TABLE ${nutrients} (
        field_name text PRIMARY KEY, unit text NOT NULL, description text NOT NULL, value_kind text NOT NULL
      )`
      yield* sql`INSERT INTO ${runs} VALUES (
        '00000000-0000-0000-0000-000000000001', '2.0.0', '0.2.0',
        '2026-01-01T00:00:00Z', '2026-01-01T00:01:00Z', '{}'::jsonb, '{}'::jsonb,
        2, 5, 'success'
      )`
      yield* sql`INSERT INTO ${foods}
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
         '00000000-0000-0000-0000-000000000001', 'Cardamom Seed', 10.8, 'australian_food_composition', 'au-1', 6.7)`
      yield* sql`UPDATE ${foods} SET carbohydrates_available = 40 WHERE food_id = 7`
      yield* sql`UPDATE ${foods} SET fiber = 2.4, sodium = 1 WHERE food_id = 1`
      yield* sql`INSERT INTO ${nutrients} (field_name, unit, description, value_kind) VALUES
        ('calories', 'kcal', 'Food energy per 100 g', 'direct'),
        ('fiber', 'g', 'Dietary fibre per 100 g', 'direct'),
        ('sodium', 'mg', 'Sodium per 100 g', 'direct')`
      yield* sql`INSERT INTO ${portions} (amount, dataset_kind, food_id, name, ordinal, unit) VALUES
        (182, 'branded', 1, '1 medium apple', 0, 'g'),
        (30, 'branded', 1, '1 cup, sliced', 1, 'g'),
        (15, 'raw', 3, '1 slice', 0, 'g')`
      yield* migrateApplicationDatabase(appSchema)
    }),
    () =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        yield* sql`DROP SCHEMA IF EXISTS ${sql(schema)} CASCADE`
        yield* sql`DROP SCHEMA IF EXISTS ${sql(appSchema)} CASCADE`
      }).pipe(Effect.orDie),
  ),
)

const databaseLayer = createDatabaseLayer({
  connectionString: databaseUrl ?? 'postgresql://mons:mons_local@localhost:5432/mons',
})
const repositoryLayers = Layer.mergeAll(
  catalogReaderLayer(schema),
  applicationRepositoryLayer({
    appSchema,
    catalogSchema: schema,
    now: () => new Date('2026-08-04T12:00:00Z'),
  }),
  userFoodRepositoryLayer({
    appSchema,
    now: () => new Date('2026-08-04T12:00:00Z'),
  }),
  mealEstimateRepositoryLayer({
    appSchema,
    now: () => new Date('2026-08-04T12:00:00Z'),
  }),
  mealLogRepositoryLayer({
    appSchema,
    catalogSchema: schema,
    now: () => new Date('2026-08-04T12:00:00Z'),
  }),
)
const testLayer = Layer.merge(fixtureLayer, repositoryLayers).pipe(
  Layer.provideMerge(databaseLayer),
)

integration('Effect SQL repositories with PostgreSQL', () => {
  layer(testLayer)((it) => {
    it.effect('reports catalog status and resolves complete barcode nutrition', () =>
      Effect.gen(function* () {
        const catalog = yield* CatalogReader
        const status = yield* catalog.getStatus
        expect(status).toMatchObject({
          active: true,
          brandedFoods: 5,
          rawFoods: 2,
          schemaVersion: '2.0.0',
        })
        const food = yield* catalog.findByGtin('00000000000001')
        expect(food).toMatchObject({
          food_id: '1',
          name: 'Apple',
          nutrients: [
            { amount: 52, field: 'calories', name: 'Food energy', unit: 'kcal' },
            { amount: 2.4, field: 'fiber', name: 'Dietary fibre', unit: 'g' },
            { amount: 1, field: 'sodium', name: 'Sodium', unit: 'mg' },
          ],
        })
      }),
    )

    it.effect('searches deterministically, validates data, and prioritizes USDA', () =>
      Effect.gen(function* () {
        const catalog = yield* CatalogReader
        const raw = yield* catalog.search({ kind: 'raw', limit: 10, query: 'apple' })
        expect(raw.map((food) => food.food_id)).toEqual(['3'])
        const fallback = yield* catalog.search({ kind: 'raw', limit: 10, query: 'cardamom' })
        expect(fallback[0]?.carbohydrates_total).toBe(40)
        const broken = yield* catalog.search({ kind: 'branded', limit: 10, query: 'broken' })
        expect(broken).toEqual([])
        const eggs = yield* catalog.search({ kind: 'branded', limit: 10, query: 'egg fried' })
        expect(eggs.map((food) => food.food_id)).toEqual(['5', '6'])
        const typo = yield* catalog.search({ kind: 'branded', limit: 10, query: 'egg friedd' })
        expect(typo.map((food) => food.food_id)).toEqual(['5', '6'])
      }),
    )

    it.effect('maps Clerk users to stable internal profiles', () =>
      Effect.gen(function* () {
        const application = yield* ApplicationRepository
        const first = yield* application.ensureProfileForClerkUser('user_database_test')
        const repeated = yield* application.ensureProfileForClerkUser('user_database_test')
        const second = yield* application.ensureProfileForClerkUser('user_database_test_two')
        expect(repeated).toBe(first)
        expect(second).not.toBe(first)
        expect(yield* application.profileBelongsToClerkUser(first, 'user_database_test')).toBe(true)
        expect(yield* application.profileBelongsToClerkUser(first, 'user_database_test_two')).toBe(
          false,
        )
      }),
    )

    it.effect('persists nutrition, food, and weight logs deterministically', () =>
      Effect.gen(function* () {
        const application = yield* ApplicationRepository
        const profileId = '00000000-0000-4000-8000-000000000001'
        const food = yield* application.saveFoodLogEntry(profileId, {
          datasetKind: 'branded',
          entryId: '00000000-0000-4000-8000-000000000002',
          foodId: '1',
          loggedAt: new Date('2026-08-04T12:00:00Z'),
          mealCategory: 'lunch',
          quantityGrams: 150,
        })
        expect(food).toMatchObject({ calories_per_100g: 52, name: 'Apple', quantity_grams: 150 })
        const plan = yield* application.saveNutritionPlan(profileId, {
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
        expect(plan).toMatchObject({ calorie_target_kcal: 1460, estimated_expenditure_kcal: 1772 })
        yield* application.saveWeightLogEntry(profileId, {
          entryId: '00000000-0000-4000-8000-000000000031',
          measuredAt: new Date('2026-08-03T11:00:00Z'),
          weightKg: 56.9,
        })
        yield* application.saveWeightLogEntry(profileId, {
          entryId: '00000000-0000-4000-8000-000000000030',
          measuredAt: new Date('2026-08-04T11:00:00Z'),
          weightKg: 56.7,
        })
        const weights = yield* application.listWeightLog(
          profileId,
          new Date('2026-08-01T00:00:00Z'),
          new Date('2026-09-01T00:00:00Z'),
        )
        expect(weights.map((entry) => entry.weight_kg)).toEqual([56.9, 56.7])
      }),
    )

    it.effect('persists custom foods and calculates recipe portions from measured yield', () =>
      Effect.gen(function* () {
        const profileId = '00000000-0000-4000-8000-000000000001'
        const library = yield* UserFoodRepository
        const application = yield* ApplicationRepository
        yield* application.ensureProfile(profileId)
        const custom = yield* library.saveCustomFood(profileId, {
          barcode: '00000000000009',
          brand: 'Home',
          calories: 100,
          carbohydrates: 20,
          foodId: '00000000-0000-4000-8000-000000000090',
          imageDataBase64: null,
          name: 'Test Ingredient',
          nutritionLabelImageDataBase64: null,
          portions: [{ amount: 30, name: '1 scoop', unit: 'g' }],
          protein: 5,
          totalFat: 2,
        })
        expect(custom.portions).toMatchObject([{ amount: 30, name: '1 scoop' }])
        const recipe = yield* library.saveRecipe(profileId, {
          freeformIngredients: [
            {
              calories: 0,
              carbohydrates: 0,
              ingredientId: '00000000-0000-4000-8000-000000000094',
              name: 'garlic',
              protein: 0,
              quantity: 2,
              text: '2 tbsp garlic',
              totalFat: 0,
              unit: 'tbsp',
            },
          ],
          imageDataBase64: null,
          ingredients: [
            {
              calories: 100,
              carbohydrates: 20,
              foodId: custom.food.food_id,
              ingredientId: '00000000-0000-4000-8000-000000000092',
              name: custom.food.name,
              protein: 5,
              quantityGrams: 200,
              sourceKind: 'custom',
              totalFat: 2,
            },
          ],
          name: 'Measured Recipe',
          notes: '',
          recipeId: '00000000-0000-4000-8000-000000000091',
          servings: 4,
          totalYieldGrams: 500,
        })
        expect(recipe.recipe).toMatchObject({
          calories_per_100g: 40,
          nutrition_status: 'mixed',
          total_yield_grams: 500,
        })
        expect(recipe.freeformIngredients).toMatchObject([
          { name: 'garlic', quantity: 2, text: '2 tbsp garlic', unit: 'tbsp' },
        ])
        const logged = yield* application.saveFoodLogEntry(profileId, {
          datasetKind: 'recipe',
          entryId: '00000000-0000-4000-8000-000000000093',
          foodId: recipe.recipe.recipe_id,
          loggedAt: new Date('2026-08-04T18:00:00Z'),
          mealCategory: 'dinner',
          quantityGrams: 125,
        })
        expect(logged).toMatchObject({ calories_per_100g: 40, quantity_grams: 125 })
      }),
    )

    it.effect('commits media metadata with a meal and durably queues deletion', () =>
      Effect.gen(function* () {
        const application = yield* ApplicationRepository
        const estimates = yield* MealEstimateRepository
        const meals = yield* MealLogRepository
        // PostgreSQL canonicalizes UUID output to lowercase while iOS emits uppercase UUID strings.
        const profileId = 'ABCDEFAB-0000-4000-8000-000000000101'
        const estimateId = 'ABCDEFAB-0000-4000-8000-000000000102'
        const mealId = 'ABCDEFAB-0000-4000-8000-000000000103'
        const objectKey = `meals/${profileId}/${estimateId}.jpg`
        yield* application.ensureProfile(profileId)
        yield* estimates.save({
          calories: 52,
          carbohydrates: 14,
          description: 'Apple',
          estimateId,
          inputDescription: 'an apple',
          inputKind: 'photo',
          items: [],
          mediaContentType: null,
          mediaObjectKey: null,
          mediaSha256: null,
          observationModel: 'fixture-observer',
          overallConfidence: 1,
          profileId,
          promptVersion: 'fixture-v1',
          protein: 0.3,
          resolutionModel: 'fixture-resolver',
          totalFat: 0.2,
          transcript: null,
          transcriptionModel: null,
        })
        yield* meals.enqueueMediaCleanup(objectKey, new Date('2026-08-05T12:00:00Z'))

        const saved = yield* meals.save(profileId, {
          description: 'Apple',
          estimateId,
          items: [
            {
              datasetKind: 'branded',
              entryId: 'ABCDEFAB-0000-4000-8000-000000000104',
              foodId: '1',
              quantityGrams: 182,
            },
          ],
          loggedAt: new Date('2026-08-04T12:00:00Z'),
          mealCategory: 'lunch',
          mealId,
          media: { contentType: 'image/jpeg', objectKey, sha256: 'fixture-sha256' },
        })
        expect(saved.meal.media_object_key).toBe(objectKey)
        expect(yield* meals.listMediaCleanup(10)).toEqual([])

        expect(yield* meals.delete(profileId, mealId)).toBeDefined()
        expect(yield* meals.listMediaCleanup(10)).toEqual([objectKey])
        expect(yield* estimates.findById(profileId, estimateId)).toBeUndefined()
      }),
    )

    it.effect('persists workout sessions and ordered template hierarchies', () =>
      Effect.gen(function* () {
        const application = yield* ApplicationRepository
        const profileId = '00000000-0000-4000-8000-000000000001'
        yield* application.saveWorkout(profileId, {
          completedAt: new Date('2026-08-04T14:00:00Z'),
          distanceKilometers: null,
          durationMinutes: 60,
          kind: 'strength',
          sessionId: '00000000-0000-4000-8000-000000000010',
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
        const workouts = yield* application.listWorkouts(
          profileId,
          new Date('2026-08-01T00:00:00Z'),
          new Date('2026-09-01T00:00:00Z'),
        )
        expect(workouts[0]?.sets.map((set) => set.title)).toEqual(['Bench Press'])
        const templateId = 'ABCDEFAB-0000-4000-8000-000000000040'
        yield* application.saveWorkoutTemplate(profileId, {
          exercises: [
            {
              category: 'Lower Body',
              equipment: 'Barbell',
              exerciseId: 'barbell-squat',
              name: 'Barbell Squat',
              notes: '',
              templateExerciseId: '00000000-0000-4000-8000-000000000041',
              sets: [
                {
                  repetitions: 8,
                  restSeconds: 90,
                  setId: '00000000-0000-4000-8000-000000000042',
                  weightPounds: 135,
                },
                {
                  repetitions: 6,
                  restSeconds: 120,
                  setId: '00000000-0000-4000-8000-000000000043',
                  weightPounds: 155,
                },
              ],
            },
          ],
          name: 'Leg Day',
          templateId,
        })
        const templates = yield* application.listWorkoutTemplates(profileId)
        expect(templates[0]?.exercises[0]?.sets.map((set) => set.repetitions)).toEqual([8, 6])
        expect(yield* application.deleteWorkoutTemplate(profileId, templateId)).toBe(true)
      }),
    )
  })
})
