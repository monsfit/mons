import type { CatalogReader, FoodRecord } from '@regolith/database'
import { describe, expect, test } from 'vitest'

import { createApp } from './app.js'

const sampleFood: FoodRecord = {
  brand: 'Example Brand',
  calories: 120,
  dataset_kind: 'branded',
  food_id: '42',
  gtin: '00012345678905',
  ingestion_run_id: '00000000-0000-0000-0000-000000000001',
  name: 'Example Food',
  protein: 5,
  source: 'test',
  source_id: 'food-42',
  total_fat: 2,
}

const catalog: CatalogReader = {
  findByGtin: async (gtin) => (gtin === sampleFood.gtin ? sampleFood : undefined),
  getStatus: async () => ({
    active: true,
    brandedFoods: 4_092_797,
    completedAt: new Date('2026-08-04T00:00:00Z'),
    rawFoods: 26_163,
    schemaVersion: '2.0.0',
    snapshotId: '00000000-0000-0000-0000-000000000001',
  }),
  search: async () => [sampleFood],
}

describe('Regolith API', () => {
  const app = createApp(catalog)

  test('returns health status', async () => {
    const response = await app.request('/health')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      service: 'api',
      status: 'ok',
      version: '0.1.0',
    })
  })

  test('returns food by GTIN', async () => {
    const response = await app.request('/v1/foods/by-gtin/00012345678905')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ foodId: '42', name: 'Example Food' })
  })

  test('validates search input', async () => {
    const response = await app.request('/v1/foods/search?q=x')
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      code: 'validation_error',
      message: 'Invalid search query',
    })
  })

  test('publishes an OpenAPI document', async () => {
    const response = await app.request('/openapi.json')
    const document = (await response.json()) as { openapi: string; paths: Record<string, unknown> }
    expect(document.openapi).toBe('3.1.0')
    expect(document.paths).toHaveProperty('/v1/foods/search')
  })
})
