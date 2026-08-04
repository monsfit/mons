import { createDatabase } from './client.js'
import { migrateApplicationDatabase, migrateCatalogSearch } from './migrations.js'

const database = createDatabase({
  connectionString:
    process.env.DATABASE_URL ?? 'postgresql://regolith:regolith_local@localhost:5432/regolith',
})

try {
  await migrateApplicationDatabase(database, process.env.REGOLITH_APP_SCHEMA ?? 'regolith_app')
  const catalogAvailable = await migrateCatalogSearch(
    database,
    process.env.REGOLITH_SCHEMA ?? 'regolith',
  )
  console.log('Regolith application database is up to date')
  console.log(
    catalogAvailable
      ? 'Regolith catalog search is up to date'
      : 'Regolith catalog is not loaded; search migration skipped',
  )
} finally {
  await database.destroy()
}
