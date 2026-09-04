import { Effect } from 'effect'
import { SqlClient } from 'effect/unstable/sql'

export const up = (schema: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const foodLogEntries = sql(`${schema}.food_log_entries`)
    const mealEstimateItems = sql(`${schema}.meal_estimate_items`)

    yield* sql`ALTER TABLE ${foodLogEntries} DROP CONSTRAINT IF EXISTS food_log_dataset_kind`
    yield* sql`ALTER TABLE ${foodLogEntries} ADD CONSTRAINT food_log_dataset_kind
      CHECK (dataset_kind in ('raw', 'branded', 'restaurant', 'custom', 'recipe'))`

    yield* sql`ALTER TABLE ${mealEstimateItems} DROP CONSTRAINT IF EXISTS meal_estimate_item_source`
    yield* sql`ALTER TABLE ${mealEstimateItems} ADD CONSTRAINT meal_estimate_item_source
      CHECK (source_kind is null or source_kind in ('raw', 'branded', 'restaurant', 'custom', 'recipe'))`
  })
