import { mkdir, writeFile } from 'node:fs/promises'

import type { CatalogReader } from '@regolith/database'
import { generateSpecs } from 'hono-openapi'

import { documentation } from './app.js'
import { createRoutes } from './routes.js'

const unusedCatalog: CatalogReader = {
  findByGtin: async () => undefined,
  getStatus: async () => ({
    active: false,
    brandedFoods: 0,
    completedAt: null,
    rawFoods: 0,
    schemaVersion: null,
    snapshotId: null,
  }),
  search: async () => [],
}

const specification = await generateSpecs(createRoutes(unusedCatalog), documentation)
await mkdir(new URL('../openapi', import.meta.url), { recursive: true })
await writeFile(
  new URL('../openapi/openapi.json', import.meta.url),
  `${JSON.stringify(specification, null, 2)}\n`,
  'utf8',
)
