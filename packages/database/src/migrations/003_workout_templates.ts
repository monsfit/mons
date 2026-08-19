import { Effect } from 'effect'
import { SqlClient } from 'effect/unstable/sql'

export const up = (schema: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const profiles = sql(`${schema}.profiles`)
    const templates = sql(`${schema}.workout_templates`)
    const exercises = sql(`${schema}.workout_template_exercises`)
    const sets = sql(`${schema}.workout_template_sets`)

    yield* sql`CREATE TABLE IF NOT EXISTS ${templates} (
      template_id uuid PRIMARY KEY,
      profile_id uuid NOT NULL REFERENCES ${profiles}(profile_id) ON DELETE CASCADE,
      name text NOT NULL CONSTRAINT workout_template_name CHECK (btrim(name) <> ''),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`
    yield* sql`CREATE INDEX IF NOT EXISTS workout_templates_profile_updated_idx
      ON ${templates} (profile_id, updated_at, template_id)`

    yield* sql`CREATE TABLE IF NOT EXISTS ${exercises} (
      template_exercise_id uuid PRIMARY KEY,
      template_id uuid NOT NULL REFERENCES ${templates}(template_id) ON DELETE CASCADE,
      ordinal integer NOT NULL CONSTRAINT workout_template_exercise_ordinal CHECK (ordinal >= 0),
      exercise_id text NOT NULL,
      name text NOT NULL CONSTRAINT workout_template_exercise_name CHECK (btrim(name) <> ''),
      category text NOT NULL,
      equipment text NOT NULL,
      notes text NOT NULL DEFAULT '',
      CONSTRAINT workout_template_exercise_ordinal_unique UNIQUE (template_id, ordinal)
    )`

    yield* sql`CREATE TABLE IF NOT EXISTS ${sets} (
      template_set_id uuid PRIMARY KEY,
      template_exercise_id uuid NOT NULL REFERENCES ${exercises}(template_exercise_id) ON DELETE CASCADE,
      ordinal integer NOT NULL CONSTRAINT workout_template_set_ordinal CHECK (ordinal >= 0),
      weight_pounds double precision NOT NULL CONSTRAINT workout_template_set_weight CHECK (weight_pounds >= 0),
      repetitions integer NOT NULL CONSTRAINT workout_template_set_repetitions CHECK (repetitions >= 0),
      rest_seconds integer NOT NULL CONSTRAINT workout_template_set_rest CHECK (rest_seconds between 0 and 3600),
      CONSTRAINT workout_template_set_ordinal_unique UNIQUE (template_exercise_id, ordinal)
    )`
  })
