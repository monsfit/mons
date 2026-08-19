import { PgClient } from '@effect/sql-pg'
import { Redacted } from 'effect'

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
