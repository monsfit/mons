import { type FoodSummary, foodSummarySchema } from '@mons/contracts'
import { Context, Effect, Layer, Schema } from 'effect'

const cachedFoodSchema = Schema.Union([
  Schema.Struct({ food: foodSummarySchema, status: Schema.Literal('found') }),
  Schema.Struct({ status: Schema.Literal('not_found') }),
])
const cachedReleaseSchema = Schema.Struct({ releaseId: Schema.String })

export type CachedFood = typeof cachedFoodSchema.Type

export interface CatalogCacheService {
  readonly getActiveReleaseId: () => Effect.Effect<string | undefined>
  readonly getFood: (key: string) => Effect.Effect<CachedFood | undefined>
  readonly putActiveReleaseId: (releaseId: string) => Effect.Effect<void>
  readonly putFood: (key: string, food: FoodSummary | undefined) => Effect.Effect<void>
}

export class CatalogCache extends Context.Service<CatalogCache, CatalogCacheService>()(
  '@mons/api/CatalogCache',
) {}

export const catalogCacheDisabledLayer = Layer.succeed(CatalogCache)({
  getActiveReleaseId: () => Effect.succeed(undefined),
  getFood: () => Effect.succeed(undefined),
  putActiveReleaseId: () => Effect.void,
  putFood: () => Effect.void,
})

export interface WorkerCacheStorage {
  readonly match: (request: Request) => Promise<Response | undefined>
  readonly put: (request: Request, response: Response) => Promise<void>
}

export interface WorkerCatalogCacheOptions {
  readonly cache: WorkerCacheStorage
  readonly namespace: string
  readonly origin: string
  readonly waitUntil: (promise: Promise<unknown>) => void
}

const FOOD_TTL_SECONDS = 30 * 24 * 60 * 60
const NOT_FOUND_TTL_SECONDS = 5 * 60
const RELEASE_TTL_SECONDS = 60

export const makeWorkerCatalogCacheLayer = (options: WorkerCatalogCacheOptions) =>
  Layer.succeed(CatalogCache)({
    getActiveReleaseId: () =>
      readUnknown(options, 'active-release').pipe(
        Effect.flatMap((value) =>
          value === undefined
            ? Effect.succeed(undefined)
            : Schema.decodeUnknownEffect(cachedReleaseSchema)(value),
        ),
        Effect.map((entry) => entry?.releaseId),
        Effect.catch(() => Effect.succeed(undefined)),
      ),
    getFood: (key) =>
      readUnknown(options, `food:${key}`).pipe(
        Effect.flatMap((value) =>
          value === undefined
            ? Effect.succeed(undefined)
            : Schema.decodeUnknownEffect(cachedFoodSchema)(value),
        ),
        Effect.catch(() => Effect.succeed(undefined)),
      ),
    putActiveReleaseId: (releaseId) =>
      writeJson(options, 'active-release', { releaseId }, RELEASE_TTL_SECONDS),
    putFood: (key, food) => {
      const entry: CachedFood =
        food === undefined ? { status: 'not_found' } : { food, status: 'found' }
      return writeJson(
        options,
        `food:${key}`,
        entry,
        food === undefined ? NOT_FOUND_TTL_SECONDS : FOOD_TTL_SECONDS,
      )
    },
  })

const cacheRequest = (options: WorkerCatalogCacheOptions, key: string) => {
  const url = new URL(options.origin)
  url.pathname = `/__mons-cache/catalog/${encodeURIComponent(options.namespace)}/${encodeURIComponent(key)}`
  url.search = ''
  return new Request(url, { method: 'GET' })
}

const readUnknown = (
  options: WorkerCatalogCacheOptions,
  key: string,
): Effect.Effect<unknown | undefined> =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise(() => options.cache.match(cacheRequest(options, key)))
    if (response === undefined) return undefined
    return yield* Effect.tryPromise(() => response.json())
  }).pipe(Effect.catch(() => Effect.succeed(undefined)))

const writeJson = (
  options: WorkerCatalogCacheOptions,
  key: string,
  value: unknown,
  ttlSeconds: number,
) =>
  Effect.sync(() => {
    const response = Response.json(value, {
      headers: { 'Cache-Control': `public, max-age=${ttlSeconds}` },
    })
    const write = options.cache
      .put(cacheRequest(options, key), response)
      .catch((error: unknown) => console.error('Catalog cache write failed', error))
    options.waitUntil(write)
  })
