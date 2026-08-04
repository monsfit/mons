import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'

import type { CatalogDatabase } from './types.js'

export interface DatabaseOptions {
  connectionString: string
  maximumPoolSize?: number
}

export function createDatabase(options: DatabaseOptions): Kysely<CatalogDatabase> {
  return new Kysely<CatalogDatabase>({
    dialect: new PostgresDialect({
      pool: new Pool({
        application_name: 'regolith-api',
        connectionString: options.connectionString,
        max: options.maximumPoolSize ?? 10,
      }),
    }),
  })
}
