import { Effect } from 'effect'
import { SqlClient } from 'effect/unstable/sql'

export const up = (schema: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const profiles = sql(`${schema}.profiles`)
    const estimates = sql(`${schema}.meal_estimates`)
    const items = sql(`${schema}.meal_estimate_items`)

    yield* sql`CREATE TABLE IF NOT EXISTS ${estimates} (
      estimate_id uuid PRIMARY KEY,
      profile_id uuid NOT NULL REFERENCES ${profiles}(profile_id) ON DELETE CASCADE,
      input_kind text NOT NULL CONSTRAINT meal_estimate_input_kind CHECK (input_kind in ('text', 'photo', 'voice')),
      status text NOT NULL CONSTRAINT meal_estimate_status CHECK (status in ('completed', 'failed')),
      input_description text NOT NULL DEFAULT '',
      transcript text,
      media_object_key text,
      media_content_type text,
      media_sha256 char(64),
      observation_model text NOT NULL,
      resolution_model text NOT NULL,
      transcription_model text,
      prompt_version text NOT NULL,
      description text NOT NULL,
      overall_confidence double precision NOT NULL CONSTRAINT meal_estimate_confidence CHECK (overall_confidence between 0 and 1),
      calories double precision NOT NULL CONSTRAINT meal_estimate_calories CHECK (calories >= 0),
      protein double precision NOT NULL CONSTRAINT meal_estimate_protein CHECK (protein >= 0),
      carbohydrates double precision NOT NULL CONSTRAINT meal_estimate_carbohydrates CHECK (carbohydrates >= 0),
      total_fat double precision NOT NULL CONSTRAINT meal_estimate_fat CHECK (total_fat >= 0),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`
    yield* sql`CREATE INDEX IF NOT EXISTS meal_estimates_profile_created_idx
      ON ${estimates} (profile_id, created_at DESC, estimate_id)`

    yield* sql`CREATE TABLE IF NOT EXISTS ${items} (
      estimate_id uuid NOT NULL REFERENCES ${estimates}(estimate_id) ON DELETE CASCADE,
      ordinal integer NOT NULL CONSTRAINT meal_estimate_item_ordinal CHECK (ordinal >= 0),
      description text NOT NULL CONSTRAINT meal_estimate_item_description CHECK (btrim(description) <> ''),
      evidence text NOT NULL DEFAULT '',
      resolved boolean NOT NULL,
      source_kind text CONSTRAINT meal_estimate_item_source CHECK (source_kind is null or source_kind in ('raw', 'branded', 'custom', 'recipe')),
      food_id text,
      name text NOT NULL CONSTRAINT meal_estimate_item_name CHECK (btrim(name) <> ''),
      amount_grams double precision NOT NULL CONSTRAINT meal_estimate_item_amount CHECK (amount_grams > 0),
      confidence double precision NOT NULL CONSTRAINT meal_estimate_item_confidence CHECK (confidence between 0 and 1),
      calories double precision NOT NULL CONSTRAINT meal_estimate_item_calories CHECK (calories >= 0),
      protein double precision NOT NULL CONSTRAINT meal_estimate_item_protein CHECK (protein >= 0),
      carbohydrates double precision NOT NULL CONSTRAINT meal_estimate_item_carbohydrates CHECK (carbohydrates >= 0),
      total_fat double precision NOT NULL CONSTRAINT meal_estimate_item_fat CHECK (total_fat >= 0),
      CONSTRAINT meal_estimate_item_resolution CHECK (
        (resolved AND source_kind is not null AND food_id is not null) OR
        (NOT resolved AND source_kind is null AND food_id is null)
      ),
      PRIMARY KEY (estimate_id, ordinal)
    )`
  })
