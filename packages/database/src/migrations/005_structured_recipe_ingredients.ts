import { Effect } from 'effect'
import { SqlClient } from 'effect/unstable/sql'

export const up = (schema: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const ingredients = sql(`${schema}.recipe_freeform_ingredients`)

    yield* sql`ALTER TABLE ${ingredients}
      ADD COLUMN IF NOT EXISTS quantity double precision,
      ADD COLUMN IF NOT EXISTS unit text,
      ADD COLUMN IF NOT EXISTS name text`
    yield* sql`ALTER TABLE ${ingredients}
      DROP CONSTRAINT IF EXISTS recipe_freeform_quantity,
      DROP CONSTRAINT IF EXISTS recipe_freeform_unit,
      DROP CONSTRAINT IF EXISTS recipe_freeform_name`
    yield* sql`ALTER TABLE ${ingredients}
      ADD CONSTRAINT recipe_freeform_quantity CHECK (quantity is null or quantity > 0),
      ADD CONSTRAINT recipe_freeform_unit CHECK (
        unit is null or unit in (
          'can', 'clove', 'cup', 'g', 'kg', 'l', 'ml', 'oz', 'piece', 'pinch', 'lb', 'tbsp', 'tsp'
        )
      ),
      ADD CONSTRAINT recipe_freeform_name CHECK (name is null or btrim(name) <> '')`
  })
