import { sql, type Kysely } from 'kysely'

import type { CatalogDatabase } from './types.js'

const applicationMigrationLock = 7_140_222
const schemaPattern = /^[a-z_][a-z0-9_]{0,31}$/

export function validateSchemaName(schema: string): string {
  if (!schemaPattern.test(schema)) {
    throw new Error('PostgreSQL schema must be a safe lowercase identifier')
  }
  return schema
}

export async function migrateApplicationDatabase(
  database: Kysely<CatalogDatabase>,
  schema = 'regolith_app',
): Promise<void> {
  const safeSchema = validateSchemaName(schema)
  const qualified = (table: string): string => `"${safeSchema}"."${table}"`

  await database.transaction().execute(async (transaction) => {
    await sql`select pg_advisory_xact_lock(${applicationMigrationLock})`.execute(transaction)
    await transaction.schema.createSchema(safeSchema).ifNotExists().execute()
    await sql
      .raw(`
      CREATE TABLE IF NOT EXISTS ${qualified('app_migrations')} (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS ${qualified('profiles')} (
        profile_id uuid PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS ${qualified('nutrition_plans')} (
        profile_id uuid PRIMARY KEY REFERENCES ${qualified('profiles')}(profile_id) ON DELETE CASCADE,
        metabolic_sex text NOT NULL CHECK (metabolic_sex IN ('female', 'male')),
        birth_date date NOT NULL,
        height_cm double precision NOT NULL CHECK (height_cm BETWEEN 100 AND 250),
        current_weight_kg double precision NOT NULL CHECK (current_weight_kg BETWEEN 30 AND 350),
        exercise_frequency text NOT NULL CHECK (
          exercise_frequency IN ('none', 'one_to_three', 'four_to_six', 'seven_plus')
        ),
        daily_activity text NOT NULL CHECK (
          daily_activity IN ('mostly_sedentary', 'moderately_active', 'very_active')
        ),
        weight_goal text NOT NULL CHECK (weight_goal IN ('lose', 'maintain', 'gain')),
        target_weight_kg double precision NOT NULL CHECK (target_weight_kg BETWEEN 30 AND 350),
        weekly_weight_change_percent double precision NOT NULL CHECK (
          weekly_weight_change_percent BETWEEN 0 AND 1.25
        ),
        resting_energy_kcal integer NOT NULL CHECK (resting_energy_kcal > 0),
        estimated_expenditure_kcal integer NOT NULL CHECK (estimated_expenditure_kcal > 0),
        calorie_target_kcal integer NOT NULL CHECK (calorie_target_kcal >= 1000),
        estimated_weeks double precision CHECK (estimated_weeks IS NULL OR estimated_weeks >= 0),
        rate_limited boolean NOT NULL,
        calculated_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS ${qualified('food_log_entries')} (
        entry_id uuid PRIMARY KEY,
        profile_id uuid NOT NULL REFERENCES ${qualified('profiles')}(profile_id) ON DELETE CASCADE,
        dataset_kind text NOT NULL CHECK (dataset_kind IN ('raw', 'branded')),
        food_id bigint NOT NULL,
        name text NOT NULL CHECK (btrim(name) <> ''),
        brand text,
        gtin char(14),
        quantity_grams double precision NOT NULL CHECK (quantity_grams > 0),
        meal_category text NOT NULL CHECK (meal_category IN ('breakfast', 'lunch', 'dinner', 'snack')),
        logged_at timestamptz NOT NULL,
        calories_per_100g double precision,
        protein_per_100g double precision,
        carbohydrates_per_100g double precision,
        fat_per_100g double precision,
        created_at timestamptz NOT NULL DEFAULT now(),
        CHECK (gtin IS NULL OR gtin ~ '^[0-9]{14}$')
      );

      CREATE INDEX IF NOT EXISTS food_log_entries_profile_time_idx
        ON ${qualified('food_log_entries')} (profile_id, logged_at DESC, entry_id);

      CREATE TABLE IF NOT EXISTS ${qualified('weight_log_entries')} (
        entry_id uuid PRIMARY KEY,
        profile_id uuid NOT NULL REFERENCES ${qualified('profiles')}(profile_id) ON DELETE CASCADE,
        measured_at timestamptz NOT NULL,
        weight_kg double precision NOT NULL CHECK (weight_kg BETWEEN 30 AND 350),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS weight_log_entries_profile_time_idx
        ON ${qualified('weight_log_entries')} (profile_id, measured_at DESC, entry_id);

      CREATE TABLE IF NOT EXISTS ${qualified('workout_sessions')} (
        session_id uuid PRIMARY KEY,
        profile_id uuid NOT NULL REFERENCES ${qualified('profiles')}(profile_id) ON DELETE CASCADE,
        title text NOT NULL CHECK (btrim(title) <> ''),
        kind text NOT NULL CHECK (kind IN ('strength', 'cardio')),
        started_at timestamptz NOT NULL,
        completed_at timestamptz,
        duration_minutes integer NOT NULL CHECK (duration_minutes >= 0),
        distance_kilometers double precision CHECK (distance_kilometers IS NULL OR distance_kilometers >= 0),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CHECK (completed_at IS NULL OR completed_at >= started_at),
        CHECK (kind = 'cardio' OR distance_kilometers IS NULL)
      );

      CREATE INDEX IF NOT EXISTS workout_sessions_profile_time_idx
        ON ${qualified('workout_sessions')} (profile_id, started_at DESC, session_id);

      CREATE TABLE IF NOT EXISTS ${qualified('workout_sets')} (
        set_id uuid PRIMARY KEY,
        session_id uuid NOT NULL REFERENCES ${qualified('workout_sessions')}(session_id) ON DELETE CASCADE,
        ordinal integer NOT NULL CHECK (ordinal >= 0),
        title text NOT NULL CHECK (btrim(title) <> ''),
        detail text NOT NULL,
        value text NOT NULL,
        UNIQUE (session_id, ordinal)
      );

      INSERT INTO ${qualified('app_migrations')} (version)
      VALUES ('001_initial_app_data')
      ON CONFLICT (version) DO NOTHING;

      INSERT INTO ${qualified('app_migrations')} (version)
      VALUES ('002_nutrition_plans')
      ON CONFLICT (version) DO NOTHING;

      INSERT INTO ${qualified('app_migrations')} (version)
      VALUES ('003_weight_log')
      ON CONFLICT (version) DO NOTHING;
    `)
      .execute(transaction)
  })
}

export async function migrateCatalogSearch(
  database: Kysely<CatalogDatabase>,
  schema = 'regolith',
): Promise<boolean> {
  const safeSchema = validateSchemaName(schema)
  const table = `"${safeSchema}"."foods"`
  const catalog = await sql<{ exists: boolean }>`
    select to_regclass(${`${safeSchema}.foods`}) is not null as exists
  `.execute(database)
  if (catalog.rows[0]?.exists !== true) {
    return false
  }

  const column = await sql<{ exists: boolean }>`
    select exists (
      select 1 from information_schema.columns
      where table_schema = ${safeSchema}
        and table_name = 'foods'
        and column_name = 'search_document'
    ) as exists
  `.execute(database)
  let changed = false
  if (column.rows[0]?.exists !== true) {
    await sql
      .raw(`
      ALTER TABLE ${table}
      ADD COLUMN search_document tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(brand, '')), 'B')
      ) STORED
    `)
      .execute(database)
    changed = true
  }

  const indexes = await sql<{ indexname: string }>`
    select indexname from pg_indexes
    where schemaname = ${safeSchema}
      and indexname in ('raw_foods_search_document_idx', 'branded_foods_search_document_idx')
  `.execute(database)
  const names = new Set(indexes.rows.map((row) => row.indexname))
  if (!names.has('raw_foods_search_document_idx')) {
    await sql
      .raw(
        `CREATE INDEX raw_foods_search_document_idx ON "${safeSchema}"."raw_foods" USING gin (search_document)`,
      )
      .execute(database)
    changed = true
  }
  if (!names.has('branded_foods_search_document_idx')) {
    await sql
      .raw(
        `CREATE INDEX branded_foods_search_document_idx ON "${safeSchema}"."branded_foods" USING gin (search_document)`,
      )
      .execute(database)
    changed = true
  }
  if (changed) {
    await sql.raw(`ANALYZE ${table}`).execute(database)
  }
  return true
}
