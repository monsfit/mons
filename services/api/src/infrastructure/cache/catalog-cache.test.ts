import { expect, layer } from '@effect/vitest'
import type { FoodSummary } from '@mons/contracts'
import { Effect } from 'effect'

import { CatalogCache, makeWorkerCatalogCacheLayer } from './catalog-cache.ts'

const food: FoodSummary = {
  brand: 'Example',
  brandId: '1',
  calories: 100,
  carbohydrates: 10,
  datasetKind: 'branded',
  foodId: '42',
  foodGroup: 'Prepared Foods',
  foodGroupId: '17',
  gtin: '00012345678905',
  name: 'Example Food',
  nutrientBasis: { amount: 100, unit: 'g' },
  nutrients: [],
  portions: [{ amount: 30, name: '1 serving', unit: 'g' }],
  protein: 5,
  source: 'fixture',
  sourceId: 'fixture-42',
  totalFat: 4,
}

const responses = new Map<string, Response>()
const pendingWrites: Array<Promise<unknown>> = []
const cacheLayer = makeWorkerCatalogCacheLayer({
  cache: {
    match: (request) => Promise.resolve(responses.get(request.url)?.clone()),
    put: (request, response) => {
      responses.set(request.url, response.clone())
      return Promise.resolve()
    },
  },
  namespace: 'test',
  origin: 'https://api.example.test',
  waitUntil: (promise) => pendingWrites.push(promise),
})

const flushWrites = () =>
  Effect.tryPromise(() => Promise.all(pendingWrites.splice(0))).pipe(Effect.asVoid)

layer(cacheLayer)('catalog edge cache', (it) => {
  it.effect('stores release metadata and versioned food responses', () =>
    Effect.gen(function* () {
      const cache = yield* CatalogCache
      expect(yield* cache.getActiveReleaseId()).toBeUndefined()

      yield* cache.putActiveReleaseId('2026-08-27-test0001')
      yield* cache.putFood('2026-08-27-test0001:id:branded:42', food)
      yield* flushWrites()

      expect(yield* cache.getActiveReleaseId()).toBe('2026-08-27-test0001')
      expect(yield* cache.getFood('2026-08-27-test0001:id:branded:42')).toEqual({
        food,
        status: 'found',
      })
      expect(yield* cache.getFood('2026-08-28-test0002:id:branded:42')).toBeUndefined()
    }),
  )

  it.effect('uses a short negative-cache lifetime', () =>
    Effect.gen(function* () {
      const cache = yield* CatalogCache
      yield* cache.putFood('2026-08-27-test0001:id:raw:999', undefined)
      yield* flushWrites()

      expect(yield* cache.getFood('2026-08-27-test0001:id:raw:999')).toEqual({
        status: 'not_found',
      })
      const negativeResponse = [...responses.entries()].find(([key]) => key.includes('raw%3A999'))
      expect(negativeResponse?.[1].headers.get('cache-control')).toBe('public, max-age=300')
    }),
  )
})
