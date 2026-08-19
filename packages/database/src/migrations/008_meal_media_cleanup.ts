import { Effect } from 'effect'
import { SqlClient } from 'effect/unstable/sql'

export const up = (schema: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const cleanupJobs = sql(`${schema}.meal_media_cleanup_jobs`)

    yield* sql`CREATE TABLE IF NOT EXISTS ${cleanupJobs} (
      object_key text PRIMARY KEY,
      not_before timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now()
    )`
    yield* sql`CREATE INDEX IF NOT EXISTS meal_media_cleanup_due_idx
      ON ${cleanupJobs} (not_before, object_key)`
  })
