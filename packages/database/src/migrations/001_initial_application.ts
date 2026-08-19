import { Effect } from 'effect'
import { SqlClient } from 'effect/unstable/sql'

export const up = (schema: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const profiles = sql(`${schema}.profiles`)
    const nutritionPlans = sql(`${schema}.nutrition_plans`)
    const foodLogEntries = sql(`${schema}.food_log_entries`)
    const weightLogEntries = sql(`${schema}.weight_log_entries`)
    const workoutSessions = sql(`${schema}.workout_sessions`)
    const workoutSets = sql(`${schema}.workout_sets`)

    yield* sql`CREATE TABLE IF NOT EXISTS ${profiles} (
      profile_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`

    yield* sql`CREATE TABLE IF NOT EXISTS ${nutritionPlans} (
      profile_id uuid PRIMARY KEY REFERENCES ${profiles}(profile_id) ON DELETE CASCADE,
      metabolic_sex text NOT NULL CONSTRAINT nutrition_plan_metabolic_sex CHECK (metabolic_sex in ('female', 'male')),
      birth_date date NOT NULL,
      height_cm double precision NOT NULL CONSTRAINT nutrition_plan_height CHECK (height_cm between 100 and 250),
      current_weight_kg double precision NOT NULL CONSTRAINT nutrition_plan_current_weight CHECK (current_weight_kg between 30 and 350),
      exercise_frequency text NOT NULL CONSTRAINT nutrition_plan_exercise_frequency CHECK (exercise_frequency in ('none', 'one_to_three', 'four_to_six', 'seven_plus')),
      daily_activity text NOT NULL CONSTRAINT nutrition_plan_daily_activity CHECK (daily_activity in ('mostly_sedentary', 'moderately_active', 'very_active')),
      weight_goal text NOT NULL CONSTRAINT nutrition_plan_weight_goal CHECK (weight_goal in ('lose', 'maintain', 'gain')),
      target_weight_kg double precision NOT NULL CONSTRAINT nutrition_plan_target_weight CHECK (target_weight_kg between 30 and 350),
      weekly_weight_change_percent double precision NOT NULL CONSTRAINT nutrition_plan_weekly_rate CHECK (weekly_weight_change_percent between 0 and 1.25),
      resting_energy_kcal integer NOT NULL CONSTRAINT nutrition_plan_resting_energy CHECK (resting_energy_kcal > 0),
      estimated_expenditure_kcal integer NOT NULL CONSTRAINT nutrition_plan_expenditure CHECK (estimated_expenditure_kcal > 0),
      calorie_target_kcal integer NOT NULL CONSTRAINT nutrition_plan_calorie_target CHECK (calorie_target_kcal >= 1000),
      estimated_weeks double precision CONSTRAINT nutrition_plan_estimated_weeks CHECK (estimated_weeks is null or estimated_weeks >= 0),
      rate_limited boolean NOT NULL,
      calculated_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`

    yield* sql`CREATE TABLE IF NOT EXISTS ${foodLogEntries} (
      entry_id uuid PRIMARY KEY,
      profile_id uuid NOT NULL REFERENCES ${profiles}(profile_id) ON DELETE CASCADE,
      dataset_kind text NOT NULL CONSTRAINT food_log_dataset_kind CHECK (dataset_kind in ('raw', 'branded')),
      food_id bigint NOT NULL,
      name text NOT NULL CONSTRAINT food_log_name CHECK (btrim(name) <> ''),
      brand text,
      gtin char(14) CONSTRAINT food_log_gtin CHECK (gtin is null or gtin ~ '^[0-9]{14}$'),
      quantity_grams double precision NOT NULL CONSTRAINT food_log_quantity CHECK (quantity_grams > 0),
      meal_category text NOT NULL CONSTRAINT food_log_meal_category CHECK (meal_category in ('breakfast', 'lunch', 'dinner', 'snack')),
      logged_at timestamptz NOT NULL,
      calories_per_100g double precision,
      protein_per_100g double precision,
      carbohydrates_per_100g double precision,
      fat_per_100g double precision,
      created_at timestamptz NOT NULL DEFAULT now()
    )`
    yield* sql`CREATE INDEX IF NOT EXISTS food_log_entries_profile_time_idx
      ON ${foodLogEntries} (profile_id, logged_at, entry_id)`

    yield* sql`CREATE TABLE IF NOT EXISTS ${weightLogEntries} (
      entry_id uuid PRIMARY KEY,
      profile_id uuid NOT NULL REFERENCES ${profiles}(profile_id) ON DELETE CASCADE,
      measured_at timestamptz NOT NULL,
      weight_kg double precision NOT NULL CONSTRAINT weight_log_weight CHECK (weight_kg between 30 and 350),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`
    yield* sql`CREATE INDEX IF NOT EXISTS weight_log_entries_profile_time_idx
      ON ${weightLogEntries} (profile_id, measured_at, entry_id)`

    yield* sql`CREATE TABLE IF NOT EXISTS ${workoutSessions} (
      session_id uuid PRIMARY KEY,
      profile_id uuid NOT NULL REFERENCES ${profiles}(profile_id) ON DELETE CASCADE,
      title text NOT NULL CONSTRAINT workout_title CHECK (btrim(title) <> ''),
      kind text NOT NULL CONSTRAINT workout_kind CHECK (kind in ('strength', 'cardio')),
      started_at timestamptz NOT NULL,
      completed_at timestamptz,
      duration_minutes integer NOT NULL CONSTRAINT workout_duration CHECK (duration_minutes >= 0),
      distance_kilometers double precision CONSTRAINT workout_distance CHECK (distance_kilometers is null or distance_kilometers >= 0),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT workout_completion CHECK (completed_at is null or completed_at >= started_at),
      CONSTRAINT workout_strength_distance CHECK (kind = 'cardio' or distance_kilometers is null)
    )`
    yield* sql`CREATE INDEX IF NOT EXISTS workout_sessions_profile_time_idx
      ON ${workoutSessions} (profile_id, started_at, session_id)`

    yield* sql`CREATE TABLE IF NOT EXISTS ${workoutSets} (
      set_id uuid PRIMARY KEY,
      session_id uuid NOT NULL REFERENCES ${workoutSessions}(session_id) ON DELETE CASCADE,
      ordinal integer NOT NULL CONSTRAINT workout_set_ordinal CHECK (ordinal >= 0),
      title text NOT NULL CONSTRAINT workout_set_title CHECK (btrim(title) <> ''),
      detail text NOT NULL,
      value text NOT NULL,
      CONSTRAINT workout_sets_session_ordinal_unique UNIQUE (session_id, ordinal)
    )`
  })
