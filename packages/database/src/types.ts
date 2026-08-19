export type DatasetKind = 'raw' | 'branded'
export type FoodSourceKind = DatasetKind | 'custom' | 'recipe'
export type DailyActivity = 'mostly_sedentary' | 'moderately_active' | 'very_active'
export type ExerciseFrequency = 'none' | 'one_to_three' | 'four_to_six' | 'seven_plus'
export type MetabolicSex = 'female' | 'male'
export type WeightGoal = 'lose' | 'maintain' | 'gain'
export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type WorkoutKind = 'strength' | 'cardio'

export interface FoodTable {
  readonly brand: string | null
  readonly calories: number | null
  readonly carbohydrates_total: number | null
  readonly dataset_kind: DatasetKind
  readonly food_id: string
  readonly gtin: string | null
  readonly ingestion_run_id: string
  readonly name: string
  readonly protein: number | null
  readonly source: string
  readonly source_id: string
  readonly total_fat: number | null
}

export interface PortionTable {
  readonly amount: number
  readonly dataset_kind: DatasetKind
  readonly food_id: string
  readonly name: string
  readonly ordinal: number
  readonly unit: 'g' | 'ml'
}

export interface NutrientDefinitionTable {
  readonly description: string
  readonly field_name: string
  readonly unit: string
  readonly value_kind: 'direct' | 'derived'
}

export interface ProfileTable {
  readonly clerk_user_id: string | null
  readonly created_at: Date
  readonly profile_id: string
  readonly updated_at: Date
}

export interface NutritionPlanTable {
  readonly birth_date: Date
  readonly calculated_at: Date
  readonly calorie_target_kcal: number
  readonly current_weight_kg: number
  readonly daily_activity: DailyActivity
  readonly estimated_expenditure_kcal: number
  readonly estimated_weeks: number | null
  readonly exercise_frequency: ExerciseFrequency
  readonly height_cm: number
  readonly metabolic_sex: MetabolicSex
  readonly profile_id: string
  readonly rate_limited: boolean
  readonly resting_energy_kcal: number
  readonly target_weight_kg: number
  readonly updated_at: Date
  readonly weekly_weight_change_percent: number
  readonly weight_goal: WeightGoal
}

export interface WeightLogEntryTable {
  readonly created_at: Date
  readonly entry_id: string
  readonly measured_at: Date
  readonly profile_id: string
  readonly updated_at: Date
  readonly weight_kg: number
}

export interface FoodLogEntryTable {
  readonly brand: string | null
  readonly calories_per_100g: number | null
  readonly carbohydrates_per_100g: number | null
  readonly created_at: Date
  readonly dataset_kind: FoodSourceKind
  readonly entry_id: string
  readonly fat_per_100g: number | null
  readonly food_id: string
  readonly gtin: string | null
  readonly logged_at: Date
  readonly meal_category: MealCategory
  readonly meal_id: string
  readonly name: string
  readonly profile_id: string
  readonly protein_per_100g: number | null
  readonly quantity_grams: number
}

export interface CustomFoodTable {
  readonly barcode: string | null
  readonly brand: string | null
  readonly calories_per_100g: number | null
  readonly carbohydrates_per_100g: number | null
  readonly created_at: Date
  readonly fat_per_100g: number | null
  readonly food_id: string
  readonly image_data_base64: string | null
  readonly name: string
  readonly nutrition_label_image_data_base64: string | null
  readonly profile_id: string
  readonly protein_per_100g: number | null
  readonly updated_at: Date
}

export interface CustomFoodPortionTable {
  readonly amount: number
  readonly food_id: string
  readonly name: string
  readonly ordinal: number
  readonly unit: 'g' | 'ml'
}

export interface RecipeTable {
  readonly calories_per_100g: number | null
  readonly carbohydrates_per_100g: number | null
  readonly created_at: Date
  readonly fat_per_100g: number | null
  readonly image_data_base64: string | null
  readonly name: string
  readonly notes: string
  readonly nutrition_status: 'calculated' | 'estimate_pending' | 'mixed'
  readonly profile_id: string
  readonly protein_per_100g: number | null
  readonly recipe_id: string
  readonly servings: number | null
  readonly total_yield_grams: number
  readonly updated_at: Date
}

export interface WorkoutSessionTable {
  readonly completed_at: Date | null
  readonly created_at: Date
  readonly distance_kilometers: number | null
  readonly duration_minutes: number
  readonly kind: WorkoutKind
  readonly profile_id: string
  readonly session_id: string
  readonly started_at: Date
  readonly title: string
  readonly updated_at: Date
}

export interface WorkoutSetTable {
  readonly detail: string
  readonly ordinal: number
  readonly session_id: string
  readonly set_id: string
  readonly title: string
  readonly value: string
}

export interface WorkoutTemplateTable {
  readonly created_at: Date
  readonly name: string
  readonly profile_id: string
  readonly template_id: string
  readonly updated_at: Date
}

export interface WorkoutTemplateExerciseTable {
  readonly category: string
  readonly equipment: string
  readonly exercise_id: string
  readonly name: string
  readonly notes: string
  readonly ordinal: number
  readonly template_exercise_id: string
  readonly template_id: string
}

export interface WorkoutTemplateSetTable {
  readonly ordinal: number
  readonly repetitions: number
  readonly rest_seconds: number
  readonly template_exercise_id: string
  readonly template_set_id: string
  readonly weight_pounds: number
}

export interface IngestionRunTable {
  readonly branded_manifest: Readonly<Record<string, unknown>>
  readonly branded_rows: string
  readonly completed_at: Date | null
  readonly package_version: string
  readonly raw_manifest: Readonly<Record<string, unknown>>
  readonly raw_rows: string
  readonly run_id: string
  readonly schema_version: string
  readonly started_at: Date
  readonly status: 'loading' | 'success'
}
