import { Effect } from 'effect'
import { SqlClient } from 'effect/unstable/sql'

export const up = (schema: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const profiles = sql(`${schema}.profiles`)
    const estimates = sql(`${schema}.meal_estimates`)
    const meals = sql(`${schema}.meal_logs`)
    const entries = sql(`${schema}.food_log_entries`)

    yield* sql`CREATE TABLE IF NOT EXISTS ${meals} (
      meal_id uuid PRIMARY KEY,
      profile_id uuid NOT NULL REFERENCES ${profiles}(profile_id) ON DELETE CASCADE,
      estimate_id uuid UNIQUE REFERENCES ${estimates}(estimate_id) ON DELETE RESTRICT,
      description text NOT NULL CONSTRAINT meal_log_description CHECK (btrim(description) <> ''),
      meal_category text NOT NULL CONSTRAINT meal_log_category CHECK (meal_category in ('breakfast', 'lunch', 'dinner', 'snack')),
      logged_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`
    yield* sql`CREATE INDEX IF NOT EXISTS meal_logs_profile_time_idx
      ON ${meals} (profile_id, logged_at, meal_id)`

    yield* sql`ALTER TABLE ${entries} ADD COLUMN IF NOT EXISTS meal_id uuid`
    yield* sql`INSERT INTO ${meals} (
      meal_id, profile_id, description, meal_category, logged_at, created_at, updated_at
    ) SELECT entry_id, profile_id, name, meal_category, logged_at, created_at, created_at
      FROM ${entries}
      ON CONFLICT (meal_id) DO NOTHING`
    yield* sql`UPDATE ${entries} SET meal_id = entry_id WHERE meal_id IS NULL`
    yield* sql`ALTER TABLE ${entries} ALTER COLUMN meal_id SET NOT NULL`
    yield* sql`DO $$ BEGIN
      ALTER TABLE ${entries}
        ADD CONSTRAINT food_log_entries_meal_id_fk
        FOREIGN KEY (meal_id) REFERENCES ${meals}(meal_id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$`
    yield* sql`CREATE INDEX IF NOT EXISTS food_log_entries_meal_idx ON ${entries} (meal_id, entry_id)`
  })
