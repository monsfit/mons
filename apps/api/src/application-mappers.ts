import type {
  CustomFood,
  FoodLogEntry,
  NutritionPlan,
  Recipe,
  WeightLogEntry,
  Workout,
  WorkoutTemplate,
} from '@regolith/contracts'
import type {
  CustomFoodRecord,
  FoodLogEntryRecord,
  MealLogRecord,
  NutritionPlanRecord,
  RecipeRecord,
  WeightLogEntryRecord,
  WorkoutRecord,
  WorkoutTemplateRecord,
} from '@regolith/database'

function scaled(value: number | null, quantityGrams: number): number | null {
  if (value === null) {
    return null
  }
  return Math.round(value * quantityGrams * 10) / 1000
}

export function toCustomFood(record: CustomFoodRecord): CustomFood {
  return {
    barcode: record.food.barcode,
    brand: record.food.brand,
    calories: record.food.calories_per_100g,
    carbohydrates: record.food.carbohydrates_per_100g,
    foodId: record.food.food_id,
    imageDataBase64: record.food.image_data_base64,
    name: record.food.name,
    nutritionLabelImageDataBase64: record.food.nutrition_label_image_data_base64,
    portions: record.portions.map((portion) => ({
      amount: portion.amount,
      name: portion.name,
      unit: portion.unit,
    })),
    protein: record.food.protein_per_100g,
    sourceKind: 'custom',
    totalFat: record.food.fat_per_100g,
  }
}

export function toRecipe(record: RecipeRecord): Recipe {
  return {
    calories: record.recipe.calories_per_100g,
    carbohydrates: record.recipe.carbohydrates_per_100g,
    freeformIngredients: record.freeformIngredients.map((item) => ({
      calories: item.calories,
      carbohydrates: item.carbohydrates,
      ingredientId: item.ingredient_id,
      name: item.name,
      protein: item.protein,
      quantity: item.quantity,
      text: item.text,
      totalFat: item.total_fat,
      unit: item.unit,
    })),
    imageDataBase64: record.recipe.image_data_base64,
    ingredients: record.ingredients.map((item) => ({
      calories: item.calories_per_100g,
      carbohydrates: item.carbohydrates_per_100g,
      foodId: item.food_id,
      ingredientId: item.ingredient_id,
      name: item.name,
      protein: item.protein_per_100g,
      quantityGrams: item.quantity_grams,
      sourceKind: item.source_kind,
      totalFat: item.fat_per_100g,
    })),
    name: record.recipe.name,
    notes: record.recipe.notes,
    nutritionStatus: record.recipe.nutrition_status,
    protein: record.recipe.protein_per_100g,
    recipeId: record.recipe.recipe_id,
    servings: record.recipe.servings,
    sourceKind: 'recipe',
    totalFat: record.recipe.fat_per_100g,
    totalYieldGrams: record.recipe.total_yield_grams,
  }
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
    mealId: entry.meal_id,
    name: entry.name,
    protein: scaled(entry.protein_per_100g, entry.quantity_grams),
    quantityGrams: entry.quantity_grams,
  }
}

export function toMealLog(record: MealLogRecord) {
  const items = record.items.map(toFoodLogEntry)
  const total = (field: 'calories' | 'carbohydrates' | 'fat' | 'protein') =>
    items.reduce((sum, item) => sum + (item[field] ?? 0), 0)
  return {
    calories: total('calories'),
    carbohydrates: total('carbohydrates'),
    description: record.meal.description,
    estimateId: record.meal.estimate_id,
    inputKind: record.meal.input_kind,
    items,
    loggedAt: record.meal.logged_at.toISOString(),
    mealCategory: record.meal.meal_category,
    mealId: record.meal.meal_id,
    photoAvailable: record.meal.input_kind === 'photo' && record.meal.media_object_key !== null,
    protein: total('protein'),
    totalFat: total('fat'),
  }
}

export function toNutritionPlan(plan: NutritionPlanRecord): NutritionPlan {
  return {
    birthDate: plan.birth_date.toISOString().slice(0, 10),
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

export function toWorkoutTemplate(record: WorkoutTemplateRecord): WorkoutTemplate {
  return {
    exercises: record.exercises.map(({ exercise, sets }) => ({
      category: exercise.category,
      equipment: exercise.equipment,
      exerciseId: exercise.exercise_id,
      name: exercise.name,
      notes: exercise.notes,
      sets: sets.map((set) => ({
        repetitions: set.repetitions,
        restSeconds: set.rest_seconds,
        setId: set.template_set_id,
        weightPounds: set.weight_pounds,
      })),
      templateExerciseId: exercise.template_exercise_id,
    })),
    name: record.template.name,
    templateId: record.template.template_id,
  }
}
