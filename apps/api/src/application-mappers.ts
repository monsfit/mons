import type { FoodLogEntry, NutritionPlan, WeightLogEntry, Workout } from '@regolith/contracts'
import type {
  FoodLogEntryRecord,
  NutritionPlanRecord,
  WeightLogEntryRecord,
  WorkoutRecord,
} from '@regolith/database'

function scaled(value: number | null, quantityGrams: number): number | null {
  if (value === null) {
    return null
  }
  return Math.round(value * quantityGrams * 10) / 1000
}

export function toFoodLogEntry(entry: FoodLogEntryRecord): FoodLogEntry {
  return {
    brand: entry.brand,
    calories: scaled(entry.calories_per_100g, entry.quantity_grams),
    carbohydrates: scaled(entry.carbohydrates_per_100g, entry.quantity_grams),
    datasetKind: entry.dataset_kind,
    entryId: entry.entry_id,
    fat: scaled(entry.fat_per_100g, entry.quantity_grams),
    foodId: entry.food_id,
    gtin: entry.gtin,
    loggedAt: entry.logged_at.toISOString(),
    mealCategory: entry.meal_category,
    name: entry.name,
    protein: scaled(entry.protein_per_100g, entry.quantity_grams),
    quantityGrams: entry.quantity_grams,
  }
}

export function toNutritionPlan(plan: NutritionPlanRecord): NutritionPlan {
  return {
    birthDate: plan.birth_date,
    calculatedAt: plan.calculated_at.toISOString(),
    calorieTargetKcal: plan.calorie_target_kcal,
    currentWeightKg: plan.current_weight_kg,
    dailyActivity: plan.daily_activity,
    estimatedExpenditureKcal: plan.estimated_expenditure_kcal,
    estimatedWeeks: plan.estimated_weeks,
    exerciseFrequency: plan.exercise_frequency,
    heightCm: plan.height_cm,
    metabolicSex: plan.metabolic_sex,
    rateLimited: plan.rate_limited,
    restingEnergyKcal: plan.resting_energy_kcal,
    targetWeightKg: plan.target_weight_kg,
    weeklyWeightChangePercent: plan.weekly_weight_change_percent,
    weightGoal: plan.weight_goal,
  }
}

export function toWeightLogEntry(entry: WeightLogEntryRecord): WeightLogEntry {
  return {
    entryId: entry.entry_id,
    measuredAt: entry.measured_at.toISOString(),
    weightKg: entry.weight_kg,
  }
}

export function toWorkout(record: WorkoutRecord): Workout {
  return {
    completedAt: record.session.completed_at?.toISOString() ?? null,
    distanceKilometers: record.session.distance_kilometers,
    durationMinutes: record.session.duration_minutes,
    kind: record.session.kind,
    sessionId: record.session.session_id,
    sets: record.sets.map((set) => ({
      detail: set.detail,
      setId: set.set_id,
      title: set.title,
      value: set.value,
    })),
    startedAt: record.session.started_at.toISOString(),
    title: record.session.title,
  }
}
