import {
  catalogStatusSchema,
  errorSchema,
  foodSearchQuerySchema,
  foodSearchResponseSchema,
  foodSummarySchema,
  gtinPathSchema,
  healthSchema,
} from '@regolith/contracts'
import type { ApplicationRepository, CatalogReader } from '@regolith/database'
import { Hono } from 'hono'
import { describeRoute, resolver, validator } from 'hono-openapi'

import { toFoodSummary } from './mappers.js'
import { createApplicationRoutes } from './application-routes.js'
import {
  createAuthenticationMiddleware,
  createProfileAuthorizationMiddleware,
  type RequestAuthenticator,
} from './auth.js'

export function createRoutes(
  catalog: CatalogReader,
  application: ApplicationRepository,
  authenticator: RequestAuthenticator,
): Hono {
  const routes = new Hono()

  routes.use('/v1/*', createAuthenticationMiddleware(authenticator))
  routes.use('/v1/profiles/:profileId', createProfileAuthorizationMiddleware(application))
  routes.use('/v1/profiles/:profileId/*', createProfileAuthorizationMiddleware(application))
  routes.route('/', createApplicationRoutes(application))

  routes.get(
    '/health',
    describeRoute({
      operationId: 'getHealth',
      security: [],
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(healthSchema) } },
          description: 'API is healthy',
        },
      },
      tags: ['system'],
    }),
    (context) => context.json({ service: 'api' as const, status: 'ok' as const, version: '0.1.0' }),
  )

  routes.get(
    '/v1/catalog',
    describeRoute({
      operationId: 'getCatalogStatus',
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(catalogStatusSchema) } },
          description: 'Active catalog snapshot',
        },
      },
      tags: ['catalog'],
    }),
    async (context) => {
      const status = await catalog.getStatus()
      return context.json({
        ...status,
        completedAt: status.completedAt?.toISOString() ?? null,
      })
    },
  )

  routes.get(
    '/v1/foods/by-gtin/:gtin',
    describeRoute({
      operationId: 'getFoodByGtin',
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(foodSummarySchema) } },
          description: 'Food matching the GTIN',
        },
        404: {
          content: { 'application/json': { schema: resolver(errorSchema) } },
          description: 'Food not found',
        },
        400: {
          content: { 'application/json': { schema: resolver(errorSchema) } },
          description: 'Invalid GTIN',
        },
      },
      tags: ['foods'],
    }),
    validator('param', gtinPathSchema, (result, context) => {
      if (!result.success) {
        return context.json({ code: 'validation_error', message: 'Invalid path parameters' }, 400)
      }
    }),
    async (context) => {
      const { gtin } = context.req.valid('param')
      const food = await catalog.findByGtin(gtin)
      if (food === undefined) {
        return context.json({ code: 'food_not_found', message: 'No food has that GTIN' }, 404)
      }
      return context.json(toFoodSummary(food), 200)
    },
  )

  routes.get(
    '/v1/foods/search',
    describeRoute({
      operationId: 'searchFoods',
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(foodSearchResponseSchema) } },
          description: 'Ranked food search results',
        },
        400: {
          content: { 'application/json': { schema: resolver(errorSchema) } },
          description: 'Invalid search query',
        },
      },
      tags: ['foods'],
    }),
    validator('query', foodSearchQuerySchema, (result, context) => {
      if (!result.success) {
        return context.json({ code: 'validation_error', message: 'Invalid search query' }, 400)
      }
    }),
    async (context) => {
      const query = context.req.valid('query')
      const foods = await catalog.search({
        ...(query.kind === undefined ? {} : { kind: query.kind }),
        limit: query.limit ?? 20,
        query: query.q,
      })
      return context.json({ foods: foods.map(toFoodSummary) })
    },
  )

  return routes
}
