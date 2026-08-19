import { Effect } from 'effect'
import { SqlClient } from 'effect/unstable/sql'

export const up = (schema: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const profiles = sql(`${schema}.profiles`)
    const foodLogEntries = sql(`${schema}.food_log_entries`)
    const customFoods = sql(`${schema}.custom_foods`)
    const customFoodPortions = sql(`${schema}.custom_food_portions`)
    const recipes = sql(`${schema}.recipes`)
    const recipeIngredients = sql(`${schema}.recipe_ingredients`)
    const freeformIngredients = sql(`${schema}.recipe_freeform_ingredients`)

    yield* sql`ALTER TABLE ${foodLogEntries} DROP CONSTRAINT IF EXISTS food_log_dataset_kind`
    yield* sql`ALTER TABLE ${foodLogEntries} ALTER COLUMN food_id TYPE text USING food_id::text`
    yield* sql`ALTER TABLE ${foodLogEntries} ADD CONSTRAINT food_log_dataset_kind
      CHECK (dataset_kind in ('raw', 'branded', 'custom', 'recipe'))`

    yield* sql`CREATE TABLE IF NOT EXISTS ${customFoods} (
      food_id uuid PRIMARY KEY,
      profile_id uuid NOT NULL REFERENCES ${profiles}(profile_id) ON DELETE CASCADE,
      name text NOT NULL CONSTRAINT custom_food_name CHECK (btrim(name) <> ''),
      brand text,
      barcode char(14) CONSTRAINT custom_food_barcode CHECK (barcode is null or barcode ~ '^[0-9]{14}$'),
      calories_per_100g double precision CONSTRAINT custom_food_calories CHECK (calories_per_100g is null or calories_per_100g >= 0),
      protein_per_100g double precision CONSTRAINT custom_food_protein CHECK (protein_per_100g is null or protein_per_100g >= 0),
      carbohydrates_per_100g double precision CONSTRAINT custom_food_carbohydrates CHECK (carbohydrates_per_100g is null or carbohydrates_per_100g >= 0),
      fat_per_100g double precision CONSTRAINT custom_food_fat CHECK (fat_per_100g is null or fat_per_100g >= 0),
      image_data_base64 text,
      nutrition_label_image_data_base64 text,
      search_document tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(brand, '')), 'B')
      ) STORED,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`
    yield* sql`CREATE UNIQUE INDEX IF NOT EXISTS custom_foods_profile_barcode_idx
      ON ${customFoods} (profile_id, barcode) WHERE barcode IS NOT NULL`
    yield* sql`CREATE INDEX IF NOT EXISTS custom_foods_profile_updated_idx
      ON ${customFoods} (profile_id, updated_at DESC, food_id)`
    yield* sql`CREATE INDEX IF NOT EXISTS custom_foods_search_idx
      ON ${customFoods} USING gin (search_document)`

    yield* sql`CREATE TABLE IF NOT EXISTS ${customFoodPortions} (
      food_id uuid NOT NULL REFERENCES ${customFoods}(food_id) ON DELETE CASCADE,
      ordinal integer NOT NULL CONSTRAINT custom_food_portion_ordinal CHECK (ordinal >= 0),
      amount double precision NOT NULL CONSTRAINT custom_food_portion_amount CHECK (amount >= 0.1),
      name text NOT NULL CONSTRAINT custom_food_portion_name CHECK (btrim(name) <> ''),
      unit text NOT NULL CONSTRAINT custom_food_portion_unit CHECK (unit in ('g', 'ml')),
      PRIMARY KEY (food_id, ordinal)
    )`

    yield* sql`CREATE TABLE IF NOT EXISTS ${recipes} (
      recipe_id uuid PRIMARY KEY,
      profile_id uuid NOT NULL REFERENCES ${profiles}(profile_id) ON DELETE CASCADE,
      name text NOT NULL CONSTRAINT recipe_name CHECK (btrim(name) <> ''),
      notes text NOT NULL DEFAULT '',
      total_yield_grams double precision NOT NULL CONSTRAINT recipe_yield CHECK (total_yield_grams > 0),
      servings double precision CONSTRAINT recipe_servings CHECK (servings is null or servings > 0),
      calories_per_100g double precision,
      protein_per_100g double precision,
      carbohydrates_per_100g double precision,
      fat_per_100g double precision,
      nutrition_status text NOT NULL CONSTRAINT recipe_nutrition_status CHECK (nutrition_status in ('calculated', 'estimate_pending', 'mixed')),
      image_data_base64 text,
      search_document tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(notes, '')), 'C')
      ) STORED,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`
    yield* sql`CREATE INDEX IF NOT EXISTS recipes_profile_updated_idx
      ON ${recipes} (profile_id, updated_at DESC, recipe_id)`
    yield* sql`CREATE INDEX IF NOT EXISTS recipes_search_idx ON ${recipes} USING gin (search_document)`

    yield* sql`CREATE TABLE IF NOT EXISTS ${recipeIngredients} (
      ingredient_id uuid PRIMARY KEY,
      recipe_id uuid NOT NULL REFERENCES ${recipes}(recipe_id) ON DELETE CASCADE,
      ordinal integer NOT NULL CONSTRAINT recipe_ingredient_ordinal CHECK (ordinal >= 0),
      source_kind text NOT NULL CONSTRAINT recipe_ingredient_source CHECK (source_kind in ('raw', 'branded', 'custom')),
      food_id text NOT NULL,
      name text NOT NULL CONSTRAINT recipe_ingredient_name CHECK (btrim(name) <> ''),
      quantity_grams double precision NOT NULL CONSTRAINT recipe_ingredient_quantity CHECK (quantity_grams > 0),
      calories_per_100g double precision,
      protein_per_100g double precision,
      carbohydrates_per_100g double precision,
      fat_per_100g double precision,
      CONSTRAINT recipe_ingredient_ordinal_unique UNIQUE (recipe_id, ordinal)
    )`

    yield* sql`CREATE TABLE IF NOT EXISTS ${freeformIngredients} (
      ingredient_id uuid PRIMARY KEY,
      recipe_id uuid NOT NULL REFERENCES ${recipes}(recipe_id) ON DELETE CASCADE,
      ordinal integer NOT NULL CONSTRAINT recipe_freeform_ordinal CHECK (ordinal >= 0),
      text text NOT NULL CONSTRAINT recipe_freeform_text CHECK (btrim(text) <> ''),
      calories double precision,
      protein double precision,
      carbohydrates double precision,
      total_fat double precision,
      CONSTRAINT recipe_freeform_ordinal_unique UNIQUE (recipe_id, ordinal)
    )`
  })
