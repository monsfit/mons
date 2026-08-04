import { mkdir, readFile, writeFile } from 'node:fs/promises'

import type { ApplicationRepository, CatalogReader } from '@regolith/database'
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

const unusedApplication: ApplicationRepository = {
  deleteFoodLogEntry: async () => false,
  deleteWorkout: async () => false,
  ensureProfile: async () => undefined,
  getNutritionPlan: async () => undefined,
  listFoodLog: async () => [],
  listWorkouts: async () => [],
  saveFoodLogEntry: async () => undefined,
  saveNutritionPlan: async () => {
    throw new Error('OpenAPI generation does not execute handlers')
  },
  saveWorkout: async () => {
    throw new Error('OpenAPI generation does not execute handlers')
  },
}

const specification = await generateSpecs(
  createRoutes(unusedCatalog, unusedApplication),
  documentation,
)
const outputDirectory = new URL('../openapi/', import.meta.url)
const outputPath = new URL('openapi.json', outputDirectory)
const payload = `${JSON.stringify(specification, null, 2)}\n`

if (process.argv.includes('--check')) {
  const existing = await readFile(outputPath, 'utf8').catch(() => undefined)
  if (existing !== payload) {
    throw new Error('Generated OpenAPI document is stale; run pnpm openapi')
  }
} else {
  await mkdir(outputDirectory, { recursive: true })
  await writeFile(outputPath, payload, 'utf8')
}
