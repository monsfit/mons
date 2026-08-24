import { PgClient } from '@effect/sql-pg'
import { Context, Effect, Layer, Redacted } from 'effect'
import { SqlClient } from 'effect/unstable/sql'

export interface DatabaseOptions {
  readonly connectionString: string
  readonly maximumPoolSize?: number
}

export const createDatabaseLayer = (options: DatabaseOptions) =>
  PgClient.layer({
    applicationName: 'regolith-api',
    maxConnections: options.maximumPoolSize ?? 10,
    url: Redacted.make(options.connectionString),
  })

export interface DatabaseHealthService {
  readonly check: Effect.Effect<void, unknown>
}

export class DatabaseHealth extends Context.Service<DatabaseHealth, DatabaseHealthService>()(
  '@regolith/database/DatabaseHealth',
) {}

export const databaseHealthLayer = Layer.effect(
  DatabaseHealth,
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    return DatabaseHealth.of({ check: sql`SELECT 1`.pipe(Effect.asVoid) })
  }),
)
