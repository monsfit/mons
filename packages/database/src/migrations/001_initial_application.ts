import { sql, type Kysely } from 'kysely'

export async function up(database: Kysely<unknown>): Promise<void> {
  const builder = database.schema

  await builder
    .createTable('profiles')
    .ifNotExists()
    .addColumn('profile_id', 'uuid', (column) =>
      column.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .execute()

  await builder
    .createTable('nutrition_plans')
    .ifNotExists()
    .addColumn('profile_id', 'uuid', (column) =>
      column.primaryKey().references('profiles.profile_id').onDelete('cascade'),
    )
    .addColumn('metabolic_sex', 'text', (column) => column.notNull())
    .addColumn('birth_date', 'date', (column) => column.notNull())
    .addColumn('height_cm', 'double precision', (column) => column.notNull())
    .addColumn('current_weight_kg', 'double precision', (column) => column.notNull())
    .addColumn('exercise_frequency', 'text', (column) => column.notNull())
    .addColumn('daily_activity', 'text', (column) => column.notNull())
    .addColumn('weight_goal', 'text', (column) => column.notNull())
    .addColumn('target_weight_kg', 'double precision', (column) => column.notNull())
    .addColumn('weekly_weight_change_percent', 'double precision', (column) => column.notNull())
    .addColumn('resting_energy_kcal', 'integer', (column) => column.notNull())
    .addColumn('estimated_expenditure_kcal', 'integer', (column) => column.notNull())
    .addColumn('calorie_target_kcal', 'integer', (column) => column.notNull())
    .addColumn('estimated_weeks', 'double precision')
    .addColumn('rate_limited', 'boolean', (column) => column.notNull())
    .addColumn('calculated_at', 'timestamptz', (column) => column.notNull())
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addCheckConstraint('nutrition_plan_metabolic_sex', sql`metabolic_sex in ('female', 'male')`)
    .addCheckConstraint('nutrition_plan_height', sql`height_cm between 100 and 250`)
    .addCheckConstraint('nutrition_plan_current_weight', sql`current_weight_kg between 30 and 350`)
    .addCheckConstraint(
      'nutrition_plan_exercise_frequency',
      sql`exercise_frequency in ('none', 'one_to_three', 'four_to_six', 'seven_plus')`,
    )
    .addCheckConstraint(
      'nutrition_plan_daily_activity',
      sql`daily_activity in ('mostly_sedentary', 'moderately_active', 'very_active')`,
    )
    .addCheckConstraint(
      'nutrition_plan_weight_goal',
      sql`weight_goal in ('lose', 'maintain', 'gain')`,
    )
    .addCheckConstraint('nutrition_plan_target_weight', sql`target_weight_kg between 30 and 350`)
    .addCheckConstraint(
      'nutrition_plan_weekly_rate',
      sql`weekly_weight_change_percent between 0 and 1.25`,
    )
    .addCheckConstraint('nutrition_plan_resting_energy', sql`resting_energy_kcal > 0`)
    .addCheckConstraint('nutrition_plan_expenditure', sql`estimated_expenditure_kcal > 0`)
    .addCheckConstraint('nutrition_plan_calorie_target', sql`calorie_target_kcal >= 1000`)
    .addCheckConstraint(
      'nutrition_plan_estimated_weeks',
      sql`estimated_weeks is null or estimated_weeks >= 0`,
    )
    .execute()

  await builder
    .createTable('food_log_entries')
    .ifNotExists()
    .addColumn('entry_id', 'uuid', (column) => column.primaryKey())
    .addColumn('profile_id', 'uuid', (column) =>
      column.notNull().references('profiles.profile_id').onDelete('cascade'),
    )
    .addColumn('dataset_kind', 'text', (column) => column.notNull())
    .addColumn('food_id', 'bigint', (column) => column.notNull())
    .addColumn('name', 'text', (column) => column.notNull())
    .addColumn('brand', 'text')
    .addColumn('gtin', 'char(14)')
    .addColumn('quantity_grams', 'double precision', (column) => column.notNull())
    .addColumn('meal_category', 'text', (column) => column.notNull())
    .addColumn('logged_at', 'timestamptz', (column) => column.notNull())
    .addColumn('calories_per_100g', 'double precision')
    .addColumn('protein_per_100g', 'double precision')
    .addColumn('carbohydrates_per_100g', 'double precision')
    .addColumn('fat_per_100g', 'double precision')
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addCheckConstraint('food_log_dataset_kind', sql`dataset_kind in ('raw', 'branded')`)
    .addCheckConstraint('food_log_name', sql`btrim(name) <> ''`)
    .addCheckConstraint('food_log_quantity', sql`quantity_grams > 0`)
    .addCheckConstraint(
      'food_log_meal_category',
      sql`meal_category in ('breakfast', 'lunch', 'dinner', 'snack')`,
    )
    .addCheckConstraint('food_log_gtin', sql`gtin is null or gtin ~ '^[0-9]{14}$'`)
    .execute()
  await builder
    .createIndex('food_log_entries_profile_time_idx')
    .ifNotExists()
    .on('food_log_entries')
    .columns(['profile_id', 'logged_at', 'entry_id'])
    .execute()

  await builder
    .createTable('weight_log_entries')
    .ifNotExists()
    .addColumn('entry_id', 'uuid', (column) => column.primaryKey())
    .addColumn('profile_id', 'uuid', (column) =>
      column.notNull().references('profiles.profile_id').onDelete('cascade'),
    )
    .addColumn('measured_at', 'timestamptz', (column) => column.notNull())
    .addColumn('weight_kg', 'double precision', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addCheckConstraint('weight_log_weight', sql`weight_kg between 30 and 350`)
    .execute()
  await builder
    .createIndex('weight_log_entries_profile_time_idx')
    .ifNotExists()
    .on('weight_log_entries')
    .columns(['profile_id', 'measured_at', 'entry_id'])
    .execute()

  await builder
    .createTable('workout_sessions')
    .ifNotExists()
    .addColumn('session_id', 'uuid', (column) => column.primaryKey())
    .addColumn('profile_id', 'uuid', (column) =>
      column.notNull().references('profiles.profile_id').onDelete('cascade'),
    )
    .addColumn('title', 'text', (column) => column.notNull())
    .addColumn('kind', 'text', (column) => column.notNull())
    .addColumn('started_at', 'timestamptz', (column) => column.notNull())
    .addColumn('completed_at', 'timestamptz')
    .addColumn('duration_minutes', 'integer', (column) => column.notNull())
    .addColumn('distance_kilometers', 'double precision')
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addCheckConstraint('workout_title', sql`btrim(title) <> ''`)
    .addCheckConstraint('workout_kind', sql`kind in ('strength', 'cardio')`)
    .addCheckConstraint('workout_duration', sql`duration_minutes >= 0`)
    .addCheckConstraint(
      'workout_distance',
      sql`distance_kilometers is null or distance_kilometers >= 0`,
    )
    .addCheckConstraint(
      'workout_completion',
      sql`completed_at is null or completed_at >= started_at`,
    )
    .addCheckConstraint(
      'workout_strength_distance',
      sql`kind = 'cardio' or distance_kilometers is null`,
    )
    .execute()
  await builder
    .createIndex('workout_sessions_profile_time_idx')
    .ifNotExists()
    .on('workout_sessions')
    .columns(['profile_id', 'started_at', 'session_id'])
    .execute()

  await builder
    .createTable('workout_sets')
    .ifNotExists()
    .addColumn('set_id', 'uuid', (column) => column.primaryKey())
    .addColumn('session_id', 'uuid', (column) =>
      column.notNull().references('workout_sessions.session_id').onDelete('cascade'),
    )
    .addColumn('ordinal', 'integer', (column) => column.notNull())
    .addColumn('title', 'text', (column) => column.notNull())
    .addColumn('detail', 'text', (column) => column.notNull())
    .addColumn('value', 'text', (column) => column.notNull())
    .addUniqueConstraint('workout_sets_session_ordinal_unique', ['session_id', 'ordinal'])
    .addCheckConstraint('workout_set_ordinal', sql`ordinal >= 0`)
    .addCheckConstraint('workout_set_title', sql`btrim(title) <> ''`)
    .execute()
}

export async function down(database: Kysely<unknown>): Promise<void> {
  const builder = database.schema
  await builder.dropTable('workout_sets').ifExists().execute()
  await builder.dropTable('workout_sessions').ifExists().execute()
  await builder.dropTable('weight_log_entries').ifExists().execute()
  await builder.dropTable('food_log_entries').ifExists().execute()
  await builder.dropTable('nutrition_plans').ifExists().execute()
  await builder.dropTable('profiles').ifExists().execute()
}
