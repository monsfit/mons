import { serve } from '@hono/node-server'
import {
  KyselyApplicationRepository,
  KyselyCatalogReader,
  createDatabase,
  migrateApplicationDatabase,
} from '@regolith/database'

import { createApp } from './app.js'
import { createClerkRequestAuthenticator } from './auth.js'
import { loadConfig } from './config.js'

const config = loadConfig()
const database = createDatabase({ connectionString: config.databaseUrl })
const catalog = new KyselyCatalogReader(database, config.schema)
await migrateApplicationDatabase(database, config.appSchema)
const application = new KyselyApplicationRepository(database, {
  appSchema: config.appSchema,
  catalogSchema: config.schema,
})
const authenticator = createClerkRequestAuthenticator({
  publishableKey: config.clerkPublishableKey,
  secretKey: config.clerkSecretKey,
})
const app = createApp(catalog, application, authenticator)

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`Regolith API listening on http://localhost:${info.port}`)
})

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}; shutting down`)
  server.close(async (error) => {
    await database.destroy()
    if (error !== undefined) {
      console.error(error)
      process.exitCode = 1
    }
  })
}

process.once('SIGINT', () => void shutdown('SIGINT'))
process.once('SIGTERM', () => void shutdown('SIGTERM'))
