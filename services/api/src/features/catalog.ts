import type { MonsApi } from '../api.ts'
import { Authentication } from '../core/auth.ts'
import { CatalogCache } from '../infrastructure/cache/catalog-cache.ts'
import {
  InternalApiError,
  NotFoundError,
  RequestValidation,
  UnauthorizedError,
} from '../core/errors.ts'
import { fromService } from '../core/handler-errors.ts'
import { type ServicePersistenceError, fromRepository } from '../core/service-errors.ts'
import {
  catalogFoodPathSchema,
  type FoodItemResponse,
  type FoodSearchResult,
  type FoodSearchResponse,
  type FoodSummary,
  foodItemResponseSchema,
  foodSearchQuerySchema,
  foodSearchResponseSchema,
  gtinPathSchema,
} from '@mons/contracts'
import { CatalogReader, type FoodRecord, type FoodSearchRecord } from '@mons/database'
import { Context, Effect, Layer } from 'effect'
import { HttpApiBuilder, HttpApiEndpoint, HttpApiGroup } from 'effect/unstable/httpapi'

export const catalogApi = HttpApiGroup.make('catalog')
  .add(
    HttpApiEndpoint.get('foodByGtin', '/v1/foods/by-gtin/:gtin', {
      params: gtinPathSchema,
      success: foodItemResponseSchema,
      error: [UnauthorizedError, NotFoundError, InternalApiError],
    }),
    HttpApiEndpoint.get('foodById', '/v1/foods/:datasetKind/:foodId', {
      params: catalogFoodPathSchema,
      success: foodItemResponseSchema,
      error: [UnauthorizedError, NotFoundError, InternalApiError],
    }),
    HttpApiEndpoint.get('searchFoods', '/v1/foods/search', {
      query: foodSearchQuerySchema,
      success: foodSearchResponseSchema,
      error: [UnauthorizedError, InternalApiError],
    }),
  )
  .middleware(RequestValidation)
  .middleware(Authentication)

export const catalogHandlers = (api: typeof MonsApi) =>
  HttpApiBuilder.group(api, 'catalog', (handlers) =>
    handlers
      .handle('foodByGtin', ({ params }) =>
        Effect.gen(function* () {
          const catalog = yield* CatalogService
          const food = yield* fromService(catalog.findByGtin(params.gtin))
          if (food === undefined)
            return yield* new NotFoundError({
              code: 'food_not_found',
              message: 'No food has that GTIN',
            })
          return food
        }),
      )
      .handle('foodById', ({ params }) =>
        Effect.gen(function* () {
          const catalog = yield* CatalogService
          const food = yield* fromService(catalog.findById(params.datasetKind, params.foodId))
          if (food === undefined)
            return yield* new NotFoundError({
              code: 'food_not_found',
              message: 'No catalog food has that identifier',
            })
          return food
        }),
      )
      .handle('searchFoods', ({ query }) =>
        Effect.gen(function* () {
          const catalog = yield* CatalogService
          return yield* fromService(catalog.search(query))
        }),
      ),
  )

export function toFoodSummary(food: FoodRecord): FoodSummary {
  return {
    brand: food.brand,
    calories: food.calories,
    carbohydrates: food.carbohydrates_total,
    datasetKind: food.dataset_kind,
    foodId: food.food_id,
    gtin: food.gtin,
    name: food.name,
    nutrientBasis: food.nutrient_basis,
    nutrients: food.nutrients,
    portions: food.portions,
    protein: food.protein,
    source: food.source,
    sourceId: food.source_id,
    totalFat: food.total_fat,
  }
}

export function toFoodSearchResult(food: FoodSearchRecord): FoodSearchResult {
  return {
    brand: food.brand,
    calories: food.calories,
    carbohydrates: food.carbohydrates_total,
    datasetKind: food.dataset_kind,
    defaultPortion: food.default_portion,
    foodId: food.food_id,
    name: food.name,
    nutrientBasis: food.nutrient_basis,
    protein: food.protein,
    totalFat: food.total_fat,
  }
}

export interface CatalogServiceShape {
  readonly findById: (
    datasetKind: 'raw' | 'branded' | 'restaurant',
    foodId: string,
  ) => Effect.Effect<FoodItemResponse | undefined, ServicePersistenceError>
  readonly findByGtin: (
    gtin: string,
  ) => Effect.Effect<FoodItemResponse | undefined, ServicePersistenceError>
  readonly search: (query: {
    readonly kind?: 'raw' | 'branded' | 'restaurant'
    readonly limit?: number
    readonly q: string
  }) => Effect.Effect<FoodSearchResponse, ServicePersistenceError>
}

export const CatalogService = Context.Service<CatalogServiceShape>('@mons/api/CatalogService')

export const catalogServiceLayer = Layer.effect(
  CatalogService,
  Effect.gen(function* () {
    const catalog = yield* CatalogReader
    const cache = yield* CatalogCache

    const activeReleaseId = Effect.fn('CatalogService.activeReleaseId')(function* () {
      const cached = yield* cache.getActiveReleaseId()
      if (cached !== undefined) return cached
      const releaseId = yield* fromRepository(
        'CatalogReader.activeReleaseId',
        catalog.activeReleaseId(),
      )
      yield* cache.putActiveReleaseId(releaseId)
      return releaseId
    })

    return CatalogService.of({
      findByGtin: Effect.fn('CatalogService.findByGtin')(function* (gtin) {
        const catalogReleaseId = yield* activeReleaseId()
        const cacheKey = `${catalogReleaseId}:gtin:${gtin}`
        const cached = yield* cache.getFood(cacheKey)
        if (cached !== undefined) {
          return cached.status === 'found' ? { catalogReleaseId, food: cached.food } : undefined
        }
        const food = yield* fromRepository('CatalogReader.findByGtin', catalog.findByGtin(gtin))
        const summary = food === undefined ? undefined : toFoodSummary(food)
        yield* cache.putFood(cacheKey, summary)
        return summary === undefined ? undefined : { catalogReleaseId, food: summary }
      }),
      findById: Effect.fn('CatalogService.findById')(function* (datasetKind, foodId) {
        const catalogReleaseId = yield* activeReleaseId()
        const cacheKey = `${catalogReleaseId}:id:${datasetKind}:${foodId}`
        const cached = yield* cache.getFood(cacheKey)
        if (cached !== undefined) {
          return cached.status === 'found' ? { catalogReleaseId, food: cached.food } : undefined
        }
        const food = yield* fromRepository(
          'CatalogReader.findById',
          catalog.findById(datasetKind, foodId),
        )
        const summary = food === undefined ? undefined : toFoodSummary(food)
        yield* cache.putFood(cacheKey, summary)
        return summary === undefined ? undefined : { catalogReleaseId, food: summary }
      }),
      search: Effect.fn('CatalogService.search')(function* (query) {
        const catalogReleaseId = yield* activeReleaseId()
        const foods = yield* fromRepository(
          'CatalogReader.search',
          catalog.search({
            ...(query.kind === undefined ? {} : { kind: query.kind }),
            limit: query.limit ?? 20,
            query: query.q,
          }),
        )
        return { catalogReleaseId, foods: foods.map(toFoodSearchResult) }
      }),
    })
  }),
)
