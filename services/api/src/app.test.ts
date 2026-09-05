import { expect, layer } from '@effect/vitest'
import {
  CatalogReader,
  type CatalogReaderService,
  DatabaseHealth,
  type FoodLogEntryRecord,
  type FoodRecord,
  LegacyFoodLogRepository,
  type LegacyFoodLogRepositoryService,
  LibraryRepository,
  type LibraryRepositoryService,
  type NutritionPlanRecord,
  NutritionPlanRepository,
  type NutritionPlanRepositoryService,
  ProfileRepository,
  type ProfileRepositoryService,
  type WeightLogEntryRecord,
  WeightRepository,
  type WeightRepositoryService,
  type WorkoutRecord,
  WorkoutRepository,
  type WorkoutRepositoryService,
  type WorkoutTemplateRecord,
} from '@mons/database'
import type { MealEstimate } from '@mons/contracts'
import { Context, Effect, Layer } from 'effect'
import { HttpRouter } from 'effect/unstable/http'
import { NodeHttpServer } from '@effect/platform-node'

import { apiLayer } from './app.ts'
import { RequestAuthenticator } from './core/auth.ts'
import { catalogServiceLayer } from './features/catalog.ts'
import { catalogCacheDisabledLayer } from './infrastructure/cache/catalog-cache.ts'
import { libraryServiceLayer } from './features/library.ts'
import { legacyFoodLogServiceLayer, MealEstimation, MealLogging } from './features/meals.ts'
import { nutritionServiceLayer } from './features/nutrition.ts'
import { profileAccessServiceLayer, profileServiceLayer } from './features/profile.ts'
import { systemServiceLayer } from './features/system.ts'
import { weightServiceLayer } from './features/weight.ts'
import { workoutServiceLayer } from './features/workouts.ts'

const userId = 'user_mons_test'
const profileId = '00000000-0000-4000-8000-000000000001'
const food: FoodRecord = {
  brand: 'Example Brand',
  brand_id: '1',
  calories: 120,
  carbohydrates_total: 18,
  dataset_kind: 'branded',
  food_id: '42',
  food_group: 'Prepared Foods',
  food_group_id: '17',
  food_subgroup: 'Ready Meals',
  food_subgroup_id: '28',
  gtin: '00012345678905',
  name: 'Example Food',
  nutrient_basis: { amount: 100, unit: 'g' },
  nutrients: [{ amount: 3.2, field: 'fiber', name: 'Dietary fibre', unit: 'g' }],
  portions: [{ amount: 30, name: '1 bar', unit: 'g' }],
  protein: 5,
  restaurant: null,
  restaurant_id: null,
  source: 'test',
  source_id: 'food-42',
  total_fat: 2,
}
const foodLog: FoodLogEntryRecord = {
  brand: food.brand,
  calories_per_100g: food.calories,
  carbohydrates_per_100g: food.carbohydrates_total,
  created_at: new Date('2026-08-04T12:00:00Z'),
  dataset_kind: 'branded',
  entry_id: '00000000-0000-4000-8000-000000000010',
  fat_per_100g: food.total_fat,
  food_id: food.food_id,
  gtin: food.gtin,
  logged_at: new Date('2026-08-04T12:00:00Z'),
  meal_category: 'lunch',
  meal_id: '00000000-0000-4000-8000-000000000010',
  name: food.name,
  profile_id: profileId,
  protein_per_100g: food.protein,
  quantity_grams: 150,
}
const nutritionPlan: NutritionPlanRecord = {
  birth_date: new Date('1998-02-18T00:00:00.000Z'),
  calculated_at: new Date('2026-08-04T12:00:00Z'),
  calorie_target_kcal: 1460,
  current_weight_kg: 56.7,
  daily_activity: 'mostly_sedentary',
  estimated_expenditure_kcal: 1772,
  estimated_weeks: 16.6,
  exercise_frequency: 'none',
  height_cm: 160,
  metabolic_sex: 'female',
  profile_id: profileId,
  rate_limited: false,
  resting_energy_kcal: 1266,
  target_weight_kg: 52,
  updated_at: new Date('2026-08-04T12:00:00Z'),
  weekly_weight_change_percent: 0.5,
  weight_goal: 'lose',
}
const weight: WeightLogEntryRecord = {
  created_at: new Date('2026-08-04T11:00:00Z'),
  entry_id: '00000000-0000-4000-8000-000000000030',
  measured_at: new Date('2026-08-04T11:00:00Z'),
  profile_id: profileId,
  updated_at: new Date('2026-08-04T11:00:00Z'),
  weight_kg: 56.7,
}
const workout: WorkoutRecord = {
  session: {
    completed_at: new Date('2026-08-04T13:30:00Z'),
    created_at: new Date('2026-08-04T12:30:00Z'),
    distance_kilometers: null,
    duration_minutes: 60,
    kind: 'strength',
    profile_id: profileId,
    session_id: '00000000-0000-4000-8000-000000000020',
    started_at: new Date('2026-08-04T12:30:00Z'),
    title: 'Upper Body',
    updated_at: new Date('2026-08-04T13:30:00Z'),
  },
  sets: [
    {
      detail: '8 reps',
      ordinal: 0,
      session_id: '00000000-0000-4000-8000-000000000020',
      set_id: '00000000-0000-4000-8000-000000000021',
      title: 'Bench Press',
      value: '80 kg',
    },
  ],
}
const template: WorkoutTemplateRecord = {
  exercises: [
    {
      exercise: {
        category: 'Legs',
        equipment: 'Barbell',
        exercise_id: 'barbell-squat',
        name: 'Barbell Squat',
        notes: '',
        ordinal: 0,
        template_exercise_id: '00000000-0000-4000-8000-000000000041',
        template_id: '00000000-0000-4000-8000-000000000040',
      },
      sets: [
        {
          ordinal: 0,
          repetitions: 8,
          rest_seconds: 90,
          template_exercise_id: '00000000-0000-4000-8000-000000000041',
          template_set_id: '00000000-0000-4000-8000-000000000042',
          weight_pounds: 135,
        },
      ],
    },
  ],
  template: {
    created_at: new Date('2026-08-04T12:00:00Z'),
    name: 'Leg Day',
    profile_id: profileId,
    template_id: '00000000-0000-4000-8000-000000000040',
    updated_at: new Date('2026-08-04T12:00:00Z'),
  },
}
const mealEstimate: MealEstimate = {
  calories: 180,
  carbohydrates: 12,
  createdAt: '2026-08-04T12:00:00.000Z',
  description: 'Eggs and toast',
  estimateId: '00000000-0000-4000-8000-000000000050',
  inputKind: 'text',
  items: [
    {
      amountGrams: 100,
      calories: 180,
      carbohydrates: 12,
      confidence: 0.9,
      description: 'eggs and toast',
      evidence: 'Explicit text description',
      foodId: food.food_id,
      name: food.name,
      ordinal: 0,
      protein: 10,
      resolved: true,
      sourceKind: 'branded',
      totalFat: 8,
    },
  ],
  mediaRetained: false,
  overallConfidence: 0.9,
  protein: 10,
  status: 'completed',
  totalFat: 8,
  transcript: null,
  unresolvedItems: [],
}

const catalog: CatalogReaderService = {
  activeReleaseId: () => Effect.succeed('2026-08-27-test0001'),
  findById: (datasetKind, foodId) =>
    Effect.succeed(datasetKind === food.dataset_kind && foodId === food.food_id ? food : undefined),
  findByGtin: (gtin) => Effect.succeed(gtin === food.gtin ? food : undefined),
  listBrands: () => Effect.succeed([{ brand_id: '1', food_count: '1', name: 'Example Brand' }]),
  listFilterFacets: () => Effect.succeed([]),
  listFoodGroups: () =>
    Effect.succeed([
      { food_count: '1', food_group_id: '17', name: 'Prepared Foods', slug: 'prepared_foods' },
    ]),
  listRestaurants: () => Effect.succeed([]),
  search: () =>
    Effect.succeed([
      {
        brand: food.brand,
        additional_nutrients: {},
        brand_id: food.brand_id,
        calories: food.calories,
        carbohydrates_total: food.carbohydrates_total,
        dataset_kind: food.dataset_kind,
        default_portion: food.portions[0] ?? null,
        food_id: food.food_id,
        food_group: food.food_group,
        food_group_id: food.food_group_id,
        food_subgroup: food.food_subgroup,
        food_subgroup_id: food.food_subgroup_id,
        name: food.name,
        nutrient_basis: food.nutrient_basis,
        protein: food.protein,
        restaurant: food.restaurant,
        restaurant_id: food.restaurant_id,
        source: food.source,
        source_id: food.source_id,
        total_fat: food.total_fat,
      },
    ]),
}
const profiles: ProfileRepositoryService = {
  belongsToClerkUser: (candidate, candidateUser) =>
    Effect.succeed(candidate === profileId && candidateUser === userId),
  ensure: () => Effect.void,
  ensureForClerkUser: () => Effect.succeed(profileId),
}
const nutrition: NutritionPlanRepositoryService = {
  findByProfileId: () => Effect.succeed(nutritionPlan),
  save: () => Effect.succeed(nutritionPlan),
}
const legacyFoodLog: LegacyFoodLogRepositoryService = {
  delete: () => Effect.succeed(true),
  list: () => Effect.succeed([foodLog]),
  save: () => Effect.succeed(foodLog),
}
const library: LibraryRepositoryService = {
  deleteCustomFood: () => Effect.succeed(true),
  deleteRecipe: () => Effect.succeed(true),
  findCustomFoodByBarcode: () => Effect.succeed(undefined),
  listCustomFoods: () => Effect.succeed([]),
  listRecipes: () => Effect.succeed([]),
  saveCustomFood: () => Effect.die(new Error('Not exercised by this fixture')),
  saveRecipe: () => Effect.die(new Error('Not exercised by this fixture')),
}
const weights: WeightRepositoryService = {
  delete: () => Effect.succeed(true),
  list: () => Effect.succeed([weight]),
  save: () => Effect.succeed(weight),
}
const workouts: WorkoutRepositoryService = {
  delete: () => Effect.succeed(true),
  deleteTemplate: () => Effect.succeed(true),
  list: () => Effect.succeed([workout]),
  listTemplates: () => Effect.succeed([template]),
  save: () => Effect.succeed(workout),
  saveTemplate: () => Effect.succeed(template),
}

class TestWebHandler extends Context.Service<
  TestWebHandler,
  (request: Request) => Promise<Response>
>()('@mons/api/TestWebHandler') {}

const repositories = Layer.mergeAll(
  Layer.succeed(DatabaseHealth)({ check: Effect.void }),
  Layer.succeed(CatalogReader)(catalog),
  Layer.succeed(ProfileRepository)(profiles),
  Layer.succeed(NutritionPlanRepository)(nutrition),
  Layer.succeed(LegacyFoodLogRepository)(legacyFoodLog),
  Layer.succeed(LibraryRepository)(library),
  Layer.succeed(WeightRepository)(weights),
  Layer.succeed(WorkoutRepository)(workouts),
)
const profileAccess = profileAccessServiceLayer.pipe(Layer.provide(repositories))
const featureServices = Layer.mergeAll(
  systemServiceLayer,
  catalogServiceLayer,
  profileServiceLayer,
  nutritionServiceLayer,
  legacyFoodLogServiceLayer,
  libraryServiceLayer,
  weightServiceLayer,
  workoutServiceLayer,
).pipe(Layer.provide(Layer.mergeAll(repositories, profileAccess, catalogCacheDisabledLayer)))
const requestServices = Layer.mergeAll(
  repositories,
  profileAccess,
  featureServices,
  Layer.succeed(MealEstimation)({
    create: () => Effect.succeed(mealEstimate),
    findById: (_profileId, estimateId) =>
      Effect.succeed(estimateId === mealEstimate.estimateId ? mealEstimate : undefined),
  }),
  Layer.succeed(MealLogging)({
    delete: () => Effect.succeed(false),
    describe: () => Effect.succeed('Example meal'),
    discardEstimate: () => Effect.succeed(false),
    list: () => Effect.succeed([]),
    photo: () => Effect.succeed(undefined),
    save: () => Effect.die(new Error('Not exercised by this fixture')),
  }),
)
const authenticationLayer = Layer.succeed(RequestAuthenticator)({
  authenticate: (request) =>
    Effect.succeed(
      request.headers.get('authorization') === 'Bearer test-token' ? { userId } : undefined,
    ),
})
const testApplication = apiLayer.pipe(
  Layer.provide(authenticationLayer),
  HttpRouter.provideRequest(requestServices),
  Layer.provide(NodeHttpServer.layerHttpServices),
)
const webHandlerLayer = Layer.effect(
  TestWebHandler,
  Effect.acquireRelease(
    Effect.sync(() => HttpRouter.toWebHandler(testApplication, { disableLogger: true })),
    ({ dispose }) => Effect.promise(dispose),
  ).pipe(Effect.map(({ handler }) => handler)),
)

const request = (
  handler: (request: Request) => Promise<Response>,
  path: string,
  init: RequestInit = {},
) =>
  Effect.promise(() =>
    handler(
      new Request(`http://localhost${path}`, {
        ...init,
        headers: { authorization: 'Bearer test-token', ...init.headers },
      }),
    ),
  )
const json = (response: Response) => Effect.promise(() => response.json())

layer(webHandlerLayer)('Mons Effect HTTP API', (it) => {
  it.effect('serves health and rejects missing authentication', () =>
    Effect.gen(function* () {
      const handler = yield* TestWebHandler
      const health = yield* request(handler, '/health')
      expect(health.status).toBe(200)
      expect(yield* json(health)).toEqual({ service: 'api', status: 'ok', version: '0.1.0' })
      const rejected = yield* Effect.promise(() =>
        handler(new Request('http://localhost/v1/foods/search?q=egg')),
      )
      expect(rejected.status).toBe(401)
      expect(yield* json(rejected)).toEqual({
        code: 'unauthorized',
        message: 'Authentication required',
      })
    }),
  )

  it.effect('creates a stable authenticated profile and enforces ownership', () =>
    Effect.gen(function* () {
      const handler = yield* TestWebHandler
      const profile = yield* request(handler, '/v1/profile', { method: 'PUT' })
      expect(yield* json(profile)).toEqual({ profileId })
      const forbidden = yield* request(
        handler,
        '/v1/profiles/00000000-0000-4000-8000-000000000099/nutrition-plan',
      )
      expect(forbidden.status).toBe(403)
    }),
  )

  it.effect('searches foods, resolves GTINs, and reports deterministic validation errors', () =>
    Effect.gen(function* () {
      const handler = yield* TestWebHandler
      const search = yield* request(handler, '/v1/foods/search?q=egg')
      expect(yield* json(search)).toEqual({
        catalogReleaseId: '2026-08-27-test0001',
        foods: [
          {
            brand: 'Example Brand',
            brandId: '1',
            calories: 120,
            carbohydrates: 18,
            datasetKind: 'branded',
            defaultPortion: { amount: 30, name: '1 bar', unit: 'g' },
            foodId: '42',
            foodGroup: 'Prepared Foods',
            foodGroupId: '17',
            foodSubgroup: 'Ready Meals',
            foodSubgroupId: '28',
            name: 'Example Food',
            nutrientBasis: { amount: 100, unit: 'g' },
            protein: 5,
            restaurant: null,
            restaurantId: null,
            source: 'test',
            sourceId: 'food-42',
            totalFat: 2,
          },
        ],
      })
      const groups = yield* request(handler, '/v1/foods/groups')
      expect(yield* json(groups)).toEqual({
        catalogReleaseId: '2026-08-27-test0001',
        foodGroups: [
          {
            foodCount: 1,
            foodGroupId: '17',
            name: 'Prepared Foods',
            slug: 'prepared_foods',
          },
        ],
      })
      const brands = yield* request(handler, '/v1/foods/brands?q=example')
      expect(yield* json(brands)).toEqual({
        brands: [{ brandId: '1', foodCount: 1, name: 'Example Brand' }],
        catalogReleaseId: '2026-08-27-test0001',
      })
      const gtin = yield* request(handler, '/v1/foods/by-gtin/00012345678905')
      expect(yield* json(gtin)).toMatchObject({
        catalogReleaseId: '2026-08-27-test0001',
        food: { foodId: '42', portions: [{ name: '1 bar' }] },
      })
      const byId = yield* request(handler, '/v1/foods/branded/42')
      expect(yield* json(byId)).toMatchObject({
        catalogReleaseId: '2026-08-27-test0001',
        food: { foodId: '42', name: 'Example Food' },
      })
      const invalid = yield* request(handler, '/v1/foods/search?q=x')
      expect(invalid.status).toBe(400)
      expect(yield* json(invalid)).toEqual({
        code: 'validation_error',
        message: 'Invalid search query',
      })
    }),
  )

  it.effect('logs foods and returns quantity-scaled nutrition', () =>
    Effect.gen(function* () {
      const handler = yield* TestWebHandler
      const response = yield* request(handler, `/v1/profiles/${profileId}/food-log`, {
        body: JSON.stringify({
          datasetKind: 'branded',
          entryId: foodLog.entry_id,
          foodId: food.food_id,
          loggedAt: foodLog.logged_at.toISOString(),
          mealCategory: 'lunch',
          quantityGrams: 150,
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      })
      expect(response.status).toBe(201)
      expect(yield* json(response)).toMatchObject({ calories: 180, protein: 7.5 })
    }),
  )

  it.effect('creates and reloads a canonical meal estimate', () =>
    Effect.gen(function* () {
      const handler = yield* TestWebHandler
      const created = yield* request(handler, `/v1/profiles/${profileId}/meal-estimates`, {
        body: JSON.stringify({
          description: 'Two eggs and toast',
          estimateId: mealEstimate.estimateId,
          kind: 'text',
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      })
      expect(created.status).toBe(201)
      expect(yield* json(created)).toMatchObject({
        calories: 180,
        estimateId: mealEstimate.estimateId,
        items: [{ foodId: food.food_id, resolved: true }],
      })
      const loaded = yield* request(
        handler,
        `/v1/profiles/${profileId}/meal-estimates/${mealEstimate.estimateId}`,
      )
      expect(loaded.status).toBe(200)
      expect(yield* json(loaded)).toMatchObject({ description: 'Eggs and toast' })
    }),
  )

  it.effect('round trips nutrition, weight, workouts, and nested templates', () =>
    Effect.gen(function* () {
      const handler = yield* TestWebHandler
      const plan = yield* request(handler, `/v1/profiles/${profileId}/nutrition-plan`)
      expect(yield* json(plan)).toMatchObject({ plan: { calorieTargetKcal: 1460 } })
      const weightResponse = yield* request(
        handler,
        `/v1/profiles/${profileId}/weight-log?from=2026-08-01T00%3A00%3A00.000Z&to=2026-09-01T00%3A00%3A00.000Z`,
      )
      expect(yield* json(weightResponse)).toMatchObject({ entries: [{ weightKg: 56.7 }] })
      const workoutResponse = yield* request(
        handler,
        `/v1/profiles/${profileId}/workouts?from=2026-08-01T00%3A00%3A00.000Z&to=2026-09-01T00%3A00%3A00.000Z`,
      )
      expect(yield* json(workoutResponse)).toMatchObject({
        workouts: [{ sets: [{ title: 'Bench Press' }] }],
      })
      const templates = yield* request(handler, `/v1/profiles/${profileId}/workout-templates`)
      expect(yield* json(templates)).toMatchObject({
        templates: [{ exercises: [{ sets: [{ repetitions: 8 }] }] }],
      })
      const customFoods = yield* request(handler, `/v1/profiles/${profileId}/custom-foods`)
      expect(yield* json(customFoods)).toEqual({ foods: [] })
      const recipes = yield* request(handler, `/v1/profiles/${profileId}/recipes`)
      expect(yield* json(recipes)).toEqual({ recipes: [] })
    }),
  )

  it.effect('publishes OpenAPI generated from the same API declaration', () =>
    Effect.gen(function* () {
      const handler = yield* TestWebHandler
      const response = yield* request(handler, '/openapi.json')
      const document = yield* json(response)
      expect(document).toMatchObject({ openapi: '3.1.0' })
      expect(document.paths).toHaveProperty('/v1/profile')
      expect(document.paths).toHaveProperty(
        '/v1/profiles/{profileId}/workout-templates/{templateId}',
      )
      expect(document.paths).toHaveProperty('/v1/profiles/{profileId}/custom-foods/{foodId}')
      expect(document.paths).toHaveProperty('/v1/profiles/{profileId}/recipes/{recipeId}')
      expect(document.paths).toHaveProperty('/v1/profiles/{profileId}/meal-estimates')
      expect(document.paths).toHaveProperty('/v1/foods/{datasetKind}/{foodId}')
      expect(document.paths).toHaveProperty('/v1/foods/groups')
      expect(document.paths).toHaveProperty('/v1/foods/brands')
    }),
  )
})
