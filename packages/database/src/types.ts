import type { ColumnType, Generated, JSONColumnType } from 'kysely'

export type DatasetKind = 'raw' | 'branded'
export type DailyActivity = 'mostly_sedentary' | 'moderately_active' | 'very_active'
export type ExerciseFrequency = 'none' | 'one_to_three' | 'four_to_six' | 'seven_plus'
export type MetabolicSex = 'female' | 'male'
export type WeightGoal = 'lose' | 'maintain' | 'gain'

export interface FoodTable {
  brand: string | null
  calories: number | null
  carbohydrates_total: number | null
  dataset_kind: DatasetKind
  food_id: Generated<string>
  gtin: string | null
  ingestion_run_id: string
  name: string
  protein: number | null
  source: string
  source_id: string
  total_fat: number | null
}

export interface PortionTable {
  amount: number
  dataset_kind: DatasetKind
  food_id: string
  name: string
  ordinal: number
  unit: 'g' | 'ml'
}

export interface NutrientDefinitionTable {
  description: string
  field_name: string
  unit: string
  value_kind: 'direct' | 'derived'
}

export interface ProfileTable {
  created_at: ColumnType<Date, Date | string | undefined, never>
  profile_id: string
  updated_at: ColumnType<Date, Date | string | undefined, Date | string>
}

export interface NutritionPlanTable {
  birth_date: string
  calculated_at: ColumnType<Date, Date | string, Date | string>
  calorie_target_kcal: number
  current_weight_kg: number
  daily_activity: DailyActivity
  estimated_expenditure_kcal: number
  estimated_weeks: number | null
  exercise_frequency: ExerciseFrequency
  height_cm: number
  metabolic_sex: MetabolicSex
  profile_id: string
  rate_limited: boolean
  resting_energy_kcal: number
  target_weight_kg: number
  updated_at: ColumnType<Date, Date | string | undefined, Date | string>
  weekly_weight_change_percent: number
  weight_goal: WeightGoal
}

export interface WeightLogEntryTable {
  created_at: ColumnType<Date, Date | string | undefined, never>
  entry_id: string
  measured_at: ColumnType<Date, Date | string, Date | string>
  profile_id: string
  updated_at: ColumnType<Date, Date | string | undefined, Date | string>
  weight_kg: number
}

export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface FoodLogEntryTable {
  brand: string | null
  calories_per_100g: number | null
  carbohydrates_per_100g: number | null
  created_at: ColumnType<Date, Date | string | undefined, never>
  dataset_kind: DatasetKind
  entry_id: string
  fat_per_100g: number | null
  food_id: string
  gtin: string | null
  logged_at: ColumnType<Date, Date | string, Date | string>
  meal_category: MealCategory
  name: string
  profile_id: string
  protein_per_100g: number | null
  quantity_grams: number
}

export type WorkoutKind = 'strength' | 'cardio'

export interface WorkoutSessionTable {
  completed_at: ColumnType<Date | null, Date | string | null, Date | string | null>
  created_at: ColumnType<Date, Date | string | undefined, never>
  distance_kilometers: number | null
  duration_minutes: number
  kind: WorkoutKind
  profile_id: string
  session_id: string
  started_at: ColumnType<Date, Date | string, Date | string>
  title: string
  updated_at: ColumnType<Date, Date | string | undefined, Date | string>
}

export interface WorkoutSetTable {
  detail: string
  ordinal: number
  session_id: string
  set_id: string
  title: string
  value: string
}

export interface IngestionRunTable {
  branded_manifest: JSONColumnType<Record<string, unknown>>
  branded_rows: ColumnType<string, never, never>
  completed_at: ColumnType<Date | null, never, never>
  package_version: string
  raw_manifest: JSONColumnType<Record<string, unknown>>
  raw_rows: ColumnType<string, never, never>
  run_id: string
  schema_version: string
  started_at: ColumnType<Date, never, never>
  status: 'loading' | 'success'
}

export interface CatalogDatabase {
  app_migrations: {
    applied_at: ColumnType<Date, Date | string | undefined, never>
    version: string
  }
  branded_foods: FoodTable
  food_log_entries: FoodLogEntryTable
  foods: FoodTable
  ingestion_runs: IngestionRunTable
  nutrient_definitions: NutrientDefinitionTable
  nutrition_plans: NutritionPlanTable
  portions: PortionTable
  profiles: ProfileTable
  raw_portions: PortionTable
  raw_foods: FoodTable
  branded_portions: PortionTable
  workout_sessions: WorkoutSessionTable
  workout_sets: WorkoutSetTable
  weight_log_entries: WeightLogEntryTable
}
