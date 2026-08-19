import { Effect } from 'effect'
import { SqlClient } from 'effect/unstable/sql'

export const up = (schema: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const profiles = sql(`${schema}.profiles`)
    yield* sql`ALTER TABLE ${profiles} ALTER COLUMN profile_id SET DEFAULT gen_random_uuid()`
    yield* sql`ALTER TABLE ${profiles} ADD COLUMN IF NOT EXISTS clerk_user_id text`
    yield* sql`CREATE UNIQUE INDEX IF NOT EXISTS profiles_clerk_user_id_unique
      ON ${profiles} (clerk_user_id)`
  })
