import type { MonsApi } from '../api.ts'
import { Authentication } from '../core/auth.ts'
import {
  InternalApiError,
  NotFoundError,
  RequestValidation,
  UnauthorizedError,
} from '../core/errors.ts'
import { fromService } from '../core/handler-errors.ts'
import { type ServicePersistenceError, fromRepository } from '../core/service-errors.ts'
import {
  type FoodSummary,
  foodSearchQuerySchema,
  foodSearchResponseSchema,
  foodSummarySchema,
  gtinPathSchema,
} from '@mons/contracts'
import { CatalogReader, type FoodRecord } from '@mons/database'
import { Context, Effect, Layer } from 'effect'
import { HttpApiBuilder, HttpApiEndpoint, HttpApiGroup } from 'effect/unstable/httpapi'

export const catalogApi = HttpApiGroup.make('catalog')
  .add(
    HttpApiEndpoint.get('foodByGtin', '/v1/foods/by-gtin/:gtin', {
      params: gtinPathSchema,
      success: foodSummarySchema,
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
    nutrients: food.nutrients,
    portions: food.portions,
    protein: food.protein,
    source: food.source,
    sourceId: food.source_id,
    totalFat: food.total_fat,
  }
}

export interface CatalogServiceShape {
  readonly findByGtin: (
    gtin: string,
  ) => Effect.Effect<FoodSummary | undefined, ServicePersistenceError>
  readonly search: (query: {
    readonly kind?: 'raw' | 'branded'
    readonly limit?: number
    readonly q: string
  }) => Effect.Effect<{ readonly foods: ReadonlyArray<FoodSummary> }, ServicePersistenceError>
}

export const CatalogService = Context.Service<CatalogServiceShape>('@mons/api/CatalogService')

export const catalogServiceLayer = Layer.effect(
  CatalogService,
  Effect.gen(function* () {
    const catalog = yield* CatalogReader
    return CatalogService.of({
      findByGtin: (gtin) =>
        fromRepository('CatalogReader.findByGtin', catalog.findByGtin(gtin)).pipe(
          Effect.map((food) => (food === undefined ? undefined : toFoodSummary(food))),
        ),
      search: (query) =>
        fromRepository(
          'CatalogReader.search',
          catalog.search({
            ...(query.kind === undefined ? {} : { kind: query.kind }),
            limit: query.limit ?? 20,
            query: query.q,
          }),
        ).pipe(Effect.map((foods) => ({ foods: foods.map(toFoodSummary) }))),
    })
  }),
)
