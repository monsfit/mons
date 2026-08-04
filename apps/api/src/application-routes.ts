import {
  createFoodLogEntrySchema,
  errorSchema,
  foodLogEntryPathSchema,
  foodLogEntrySchema,
  foodLogResponseSchema,
  nutritionPlanResponseSchema,
  nutritionPlanSchema,
  profilePathSchema,
  profileSchema,
  saveWorkoutSchema,
  saveNutritionPlanSchema,
  timeRangeQuerySchema,
  workoutPathSchema,
  workoutResponseSchema,
  workoutSchema,
} from '@regolith/contracts'
import type { ApplicationRepository } from '@regolith/database'
import { Hono } from 'hono'
import { describeRoute, resolver, validator } from 'hono-openapi'

import { toFoodLogEntry, toNutritionPlan, toWorkout } from './application-mappers.js'

const validationError = { code: 'validation_error', message: 'Invalid request' } as const

export function createApplicationRoutes(application: ApplicationRepository): Hono {
  const routes = new Hono()

  routes.put(
    '/v1/profiles/:profileId',
    describeRoute({
      operationId: 'ensureProfile',
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(profileSchema) } },
          description: 'Profile is ready',
        },
        400: {
          content: { 'application/json': { schema: resolver(errorSchema) } },
          description: 'Invalid profile identifier',
        },
      },
      tags: ['profiles'],
    }),
    validator('param', profilePathSchema, (result, context) => {
      if (!result.success) return context.json(validationError, 400)
    }),
    async (context) => {
      const { profileId } = context.req.valid('param')
      await application.ensureProfile(profileId)
      return context.json({ profileId })
    },
  )

  routes.get(
    '/v1/profiles/:profileId/nutrition-plan',
    describeRoute({
      operationId: 'getNutritionPlan',
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(nutritionPlanResponseSchema) } },
          description: 'Saved nutrition plan, or null before onboarding is complete',
        },
        400: {
          content: { 'application/json': { schema: resolver(errorSchema) } },
          description: 'Invalid profile identifier',
        },
      },
      tags: ['profiles'],
    }),
    validator('param', profilePathSchema, (result, context) => {
      if (!result.success) return context.json(validationError, 400)
    }),
    async (context) => {
      const { profileId } = context.req.valid('param')
      const plan = await application.getNutritionPlan(profileId)
      return context.json({ plan: plan === undefined ? null : toNutritionPlan(plan) })
    },
  )

  routes.put(
    '/v1/profiles/:profileId/nutrition-plan',
    describeRoute({
      operationId: 'saveNutritionPlan',
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(nutritionPlanSchema) } },
          description: 'Calculated and saved nutrition plan',
        },
        400: {
          content: { 'application/json': { schema: resolver(errorSchema) } },
          description: 'Invalid or unsupported nutrition plan',
        },
      },
      tags: ['profiles'],
    }),
    validator('param', profilePathSchema, (result, context) => {
      if (!result.success) return context.json(validationError, 400)
    }),
    validator('json', saveNutritionPlanSchema, (result, context) => {
      if (!result.success) return context.json(validationError, 400)
    }),
    async (context) => {
      const { profileId } = context.req.valid('param')
      try {
        const plan = await application.saveNutritionPlan(profileId, context.req.valid('json'))
        return context.json(toNutritionPlan(plan))
      } catch (error) {
        if (error instanceof RangeError) {
          return context.json({ code: 'invalid_plan', message: error.message }, 400)
        }
        throw error
      }
    },
  )

  routes.get(
    '/v1/profiles/:profileId/food-log',
    describeRoute({
      operationId: 'listFoodLog',
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(foodLogResponseSchema) } },
          description: 'Food log entries in the requested time range',
        },
        400: {
          content: { 'application/json': { schema: resolver(errorSchema) } },
          description: 'Invalid profile or time range',
        },
      },
      tags: ['food-log'],
    }),
    validator('param', profilePathSchema, (result, context) => {
      if (!result.success) return context.json(validationError, 400)
    }),
    validator('query', timeRangeQuerySchema, (result, context) => {
      if (!result.success) return context.json(validationError, 400)
    }),
    async (context) => {
      const { profileId } = context.req.valid('param')
      const range = context.req.valid('query')
      const entries = await application.listFoodLog(
        profileId,
        new Date(range.from),
        new Date(range.to),
      )
      return context.json({ entries: entries.map(toFoodLogEntry) })
    },
  )

  routes.post(
    '/v1/profiles/:profileId/food-log',
    describeRoute({
      operationId: 'createFoodLogEntry',
      responses: {
        201: {
          content: { 'application/json': { schema: resolver(foodLogEntrySchema) } },
          description: 'Created or updated food log entry',
        },
        400: {
          content: { 'application/json': { schema: resolver(errorSchema) } },
          description: 'Invalid food log entry',
        },
        404: {
          content: { 'application/json': { schema: resolver(errorSchema) } },
          description: 'Catalog food not found',
        },
      },
      tags: ['food-log'],
    }),
    validator('param', profilePathSchema, (result, context) => {
      if (!result.success) return context.json(validationError, 400)
    }),
    validator('json', createFoodLogEntrySchema, (result, context) => {
      if (!result.success) return context.json(validationError, 400)
    }),
    async (context) => {
      const { profileId } = context.req.valid('param')
      const input = context.req.valid('json')
      const entry = await application.saveFoodLogEntry(profileId, {
        ...input,
        loggedAt: new Date(input.loggedAt),
      })
      if (entry === undefined) {
        return context.json({ code: 'food_not_found', message: 'Catalog food not found' }, 404)
      }
      return context.json(toFoodLogEntry(entry), 201)
    },
  )

  routes.delete(
    '/v1/profiles/:profileId/food-log/:entryId',
    describeRoute({
      operationId: 'deleteFoodLogEntry',
      responses: {
        204: { description: 'Food log entry deleted' },
        400: {
          content: { 'application/json': { schema: resolver(errorSchema) } },
          description: 'Invalid identifiers',
        },
        404: {
          content: { 'application/json': { schema: resolver(errorSchema) } },
          description: 'Food log entry not found',
        },
      },
      tags: ['food-log'],
    }),
    validator('param', foodLogEntryPathSchema, (result, context) => {
      if (!result.success) return context.json(validationError, 400)
    }),
    async (context) => {
      const { entryId, profileId } = context.req.valid('param')
      if (!(await application.deleteFoodLogEntry(profileId, entryId))) {
        return context.json({ code: 'entry_not_found', message: 'Food log entry not found' }, 404)
      }
      return context.body(null, 204)
    },
  )

  routes.get(
    '/v1/profiles/:profileId/workouts',
    describeRoute({
      operationId: 'listWorkouts',
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(workoutResponseSchema) } },
          description: 'Workout sessions in the requested time range',
        },
        400: {
          content: { 'application/json': { schema: resolver(errorSchema) } },
          description: 'Invalid profile or time range',
        },
      },
      tags: ['workouts'],
    }),
    validator('param', profilePathSchema, (result, context) => {
      if (!result.success) return context.json(validationError, 400)
    }),
    validator('query', timeRangeQuerySchema, (result, context) => {
      if (!result.success) return context.json(validationError, 400)
    }),
    async (context) => {
      const { profileId } = context.req.valid('param')
      const range = context.req.valid('query')
      const workouts = await application.listWorkouts(
        profileId,
        new Date(range.from),
        new Date(range.to),
      )
      return context.json({ workouts: workouts.map(toWorkout) })
    },
  )

  routes.put(
    '/v1/profiles/:profileId/workouts/:sessionId',
    describeRoute({
      operationId: 'saveWorkout',
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(workoutSchema) } },
          description: 'Saved workout session',
        },
        400: {
          content: { 'application/json': { schema: resolver(errorSchema) } },
          description: 'Invalid workout',
        },
      },
      tags: ['workouts'],
    }),
    validator('param', workoutPathSchema, (result, context) => {
      if (!result.success) return context.json(validationError, 400)
    }),
    validator('json', saveWorkoutSchema, (result, context) => {
      if (!result.success) return context.json(validationError, 400)
    }),
    async (context) => {
      const { profileId, sessionId } = context.req.valid('param')
      const input = context.req.valid('json')
      if (input.sessionId !== sessionId) {
        return context.json(validationError, 400)
      }
      const workout = await application.saveWorkout(profileId, {
        ...input,
        completedAt: input.completedAt === null ? null : new Date(input.completedAt),
        startedAt: new Date(input.startedAt),
      })
      return context.json(toWorkout(workout))
    },
  )

  routes.delete(
    '/v1/profiles/:profileId/workouts/:sessionId',
    describeRoute({
      operationId: 'deleteWorkout',
      responses: {
        204: { description: 'Workout deleted' },
        400: {
          content: { 'application/json': { schema: resolver(errorSchema) } },
          description: 'Invalid identifiers',
        },
        404: {
          content: { 'application/json': { schema: resolver(errorSchema) } },
          description: 'Workout not found',
        },
      },
      tags: ['workouts'],
    }),
    validator('param', workoutPathSchema, (result, context) => {
      if (!result.success) return context.json(validationError, 400)
    }),
    async (context) => {
      const { profileId, sessionId } = context.req.valid('param')
      if (!(await application.deleteWorkout(profileId, sessionId))) {
        return context.json({ code: 'workout_not_found', message: 'Workout not found' }, 404)
      }
      return context.body(null, 204)
    },
  )

  return routes
}
