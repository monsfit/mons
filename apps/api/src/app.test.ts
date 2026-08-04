import type {
  ApplicationRepository,
  CatalogReader,
  FoodLogEntryRecord,
  FoodRecord,
  NutritionPlanRecord,
  WeightLogEntryRecord,
  WorkoutRecord,
} from '@regolith/database'
import { describe, expect, test } from 'vitest'

import { createApp } from './app.js'

const sampleFood: FoodRecord = {
  brand: 'Example Brand',
  calories: 120,
  carbohydrates_total: 18,
  dataset_kind: 'branded',
  food_id: '42',
  gtin: '00012345678905',
  ingestion_run_id: '00000000-0000-0000-0000-000000000001',
  name: 'Example Food',
  portions: [{ amount: 30, name: '1 bar', unit: 'g' }],
  protein: 5,
  source: 'test',
  source_id: 'food-42',
  total_fat: 2,
}

const sampleFoodLogEntry: FoodLogEntryRecord = {
  brand: sampleFood.brand,
  calories_per_100g: sampleFood.calories,
  carbohydrates_per_100g: sampleFood.carbohydrates_total,
  created_at: new Date('2026-08-04T12:00:00Z'),
  dataset_kind: 'branded',
  entry_id: '00000000-0000-4000-8000-000000000010',
  fat_per_100g: sampleFood.total_fat,
  food_id: sampleFood.food_id,
  gtin: sampleFood.gtin,
  logged_at: new Date('2026-08-04T12:00:00Z'),
  meal_category: 'lunch',
  name: sampleFood.name,
  profile_id: '00000000-0000-4000-8000-000000000001',
  protein_per_100g: sampleFood.protein,
  quantity_grams: 150,
}

const sampleWorkout: WorkoutRecord = {
  session: {
    completed_at: new Date('2026-08-04T13:30:00Z'),
    created_at: new Date('2026-08-04T12:30:00Z'),
    distance_kilometers: null,
    duration_minutes: 60,
    kind: 'strength',
    profile_id: sampleFoodLogEntry.profile_id,
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

const sampleNutritionPlan: NutritionPlanRecord = {
  birth_date: '1998-02-18',
  calculated_at: new Date('2026-08-04T12:00:00Z'),
  calorie_target_kcal: 1_460,
  current_weight_kg: 56.7,
  daily_activity: 'mostly_sedentary',
  estimated_expenditure_kcal: 1_772,
  estimated_weeks: 16.6,
  exercise_frequency: 'none',
  height_cm: 160,
  metabolic_sex: 'female',
  profile_id: sampleFoodLogEntry.profile_id,
  rate_limited: false,
  resting_energy_kcal: 1_266,
  target_weight_kg: 52,
  updated_at: new Date('2026-08-04T12:00:00Z'),
  weekly_weight_change_percent: 0.5,
  weight_goal: 'lose',
}

const sampleWeightEntry: WeightLogEntryRecord = {
  created_at: new Date('2026-08-04T11:00:00Z'),
  entry_id: '00000000-0000-4000-8000-000000000030',
  measured_at: new Date('2026-08-04T11:00:00Z'),
  profile_id: sampleFoodLogEntry.profile_id,
  updated_at: new Date('2026-08-04T11:00:00Z'),
  weight_kg: 56.7,
}

const catalog: CatalogReader = {
  findByGtin: async (gtin) => (gtin === sampleFood.gtin ? sampleFood : undefined),
  getStatus: async () => ({
    active: true,
    brandedFoods: 4_092_797,
    completedAt: new Date('2026-08-04T00:00:00Z'),
    rawFoods: 26_163,
    schemaVersion: '2.0.0',
    snapshotId: '00000000-0000-0000-0000-000000000001',
  }),
  search: async () => [sampleFood],
}

const application: ApplicationRepository = {
  deleteFoodLogEntry: async () => true,
  deleteWeightLogEntry: async () => true,
  deleteWorkout: async () => true,
  ensureProfile: async () => undefined,
  getNutritionPlan: async () => sampleNutritionPlan,
  listFoodLog: async () => [sampleFoodLogEntry],
  listWorkouts: async () => [sampleWorkout],
  listWeightLog: async () => [sampleWeightEntry],
  saveFoodLogEntry: async () => sampleFoodLogEntry,
  saveNutritionPlan: async () => sampleNutritionPlan,
  saveWeightLogEntry: async () => sampleWeightEntry,
  saveWorkout: async () => sampleWorkout,
}

describe('Regolith API', () => {
  const app = createApp(catalog, application)

  test('returns health status', async () => {
    const response = await app.request('/health')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      service: 'api',
      status: 'ok',
      version: '0.1.0',
    })
  })

  test('returns food by GTIN', async () => {
    const response = await app.request('/v1/foods/by-gtin/00012345678905')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      foodId: '42',
      name: 'Example Food',
      portions: [{ amount: 30, name: '1 bar', unit: 'g' }],
    })
  })

  test('validates search input', async () => {
    const response = await app.request('/v1/foods/search?q=x')
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      code: 'validation_error',
      message: 'Invalid search query',
    })
  })

  test('creates a food log entry with quantity-scaled nutrition', async () => {
    const response = await app.request(`/v1/profiles/${sampleFoodLogEntry.profile_id}/food-log`, {
      body: JSON.stringify({
        datasetKind: 'branded',
        entryId: sampleFoodLogEntry.entry_id,
        foodId: sampleFood.food_id,
        loggedAt: sampleFoodLogEntry.logged_at.toISOString(),
        mealCategory: 'lunch',
        quantityGrams: 150,
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })
    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toMatchObject({ calories: 180, protein: 7.5 })
  })

  test('loads and saves a calculated nutrition plan', async () => {
    const path = `/v1/profiles/${sampleFoodLogEntry.profile_id}/nutrition-plan`
    const loaded = await app.request(path)
    expect(loaded.status).toBe(200)
    await expect(loaded.json()).resolves.toMatchObject({
      plan: { calorieTargetKcal: 1_460, weightGoal: 'lose' },
    })

    const saved = await app.request(path, {
      body: JSON.stringify({
        birthDate: '1998-02-18',
        currentWeightKg: 56.7,
        dailyActivity: 'mostly_sedentary',
        exerciseFrequency: 'none',
        heightCm: 160,
        metabolicSex: 'female',
        targetWeightKg: 52,
        weeklyWeightChangePercent: 0.5,
        weightGoal: 'lose',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'PUT',
    })
    expect(saved.status).toBe(200)
    await expect(saved.json()).resolves.toMatchObject({ calorieTargetKcal: 1_460 })
  })

  test('saves a workout with ordered sets', async () => {
    const response = await app.request(
      `/v1/profiles/${sampleFoodLogEntry.profile_id}/workouts/${sampleWorkout.session.session_id}`,
      {
        body: JSON.stringify({
          completedAt: sampleWorkout.session.completed_at?.toISOString(),
          distanceKilometers: null,
          durationMinutes: 60,
          kind: 'strength',
          sessionId: sampleWorkout.session.session_id,
          sets: sampleWorkout.sets.map((set) => ({
            detail: set.detail,
            setId: set.set_id,
            title: set.title,
            value: set.value,
          })),
          startedAt: sampleWorkout.session.started_at.toISOString(),
          title: sampleWorkout.session.title,
        }),
        headers: { 'content-type': 'application/json' },
        method: 'PUT',
      },
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      sessionId: sampleWorkout.session.session_id,
      sets: [{ title: 'Bench Press' }],
    })
  })

  test('loads and saves canonical weight entries', async () => {
    const path = `/v1/profiles/${sampleFoodLogEntry.profile_id}/weight-log`
    const loaded = await app.request(
      `${path}?from=2026-08-01T00%3A00%3A00.000Z&to=2026-09-01T00%3A00%3A00.000Z`,
    )
    expect(loaded.status).toBe(200)
    await expect(loaded.json()).resolves.toEqual({
      entries: [
        {
          entryId: sampleWeightEntry.entry_id,
          measuredAt: sampleWeightEntry.measured_at.toISOString(),
          weightKg: 56.7,
        },
      ],
    })

    const saved = await app.request(path, {
      body: JSON.stringify({
        entryId: sampleWeightEntry.entry_id,
        measuredAt: sampleWeightEntry.measured_at.toISOString(),
        weightKg: 56.7,
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })
    expect(saved.status).toBe(201)
    await expect(saved.json()).resolves.toMatchObject({ weightKg: 56.7 })
  })

  test('publishes an OpenAPI document', async () => {
    const response = await app.request('/openapi.json')
    const document = (await response.json()) as { openapi: string; paths: Record<string, unknown> }
    expect(document.openapi).toBe('3.1.0')
    expect(document.paths).toHaveProperty('/v1/foods/search')
    expect(document.paths).toHaveProperty('/v1/profiles/{profileId}/food-log')
    expect(document.paths).toHaveProperty('/v1/profiles/{profileId}/nutrition-plan')
    expect(document.paths).toHaveProperty('/v1/profiles/{profileId}/workouts/{sessionId}')
  })
})
