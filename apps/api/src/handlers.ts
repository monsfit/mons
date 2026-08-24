import { Effect, Layer } from 'effect'
import { HttpApiBuilder, HttpApiSchema } from 'effect/unstable/httpapi'
import {
  ApplicationRepository,
  CatalogReader,
  DatabaseHealth,
  UserFoodRepository,
} from '@regolith/database'

import { RegolithApi } from './api.ts'
import { CurrentIdentity } from './auth.ts'
import {
  InternalApiError,
  NotFoundError,
  forbiddenError,
  internalApiError,
  serviceUnavailableError,
  validationError,
} from './errors.ts'
import {
  toFoodLogEntry,
  toMealLog,
  toCustomFood,
  toNutritionPlan,
  toRecipe,
  toWeightLogEntry,
  toWorkout,
  toWorkoutTemplate,
} from './application-mappers.ts'
import { toFoodSummary } from './mappers.ts'
import { MealEstimation } from './meal-estimation.ts'
import { MealLogging } from './meal-logging.ts'
import { fromMealEstimation, fromMealLogging } from './service-error-mapping.ts'

const fromRepository = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, InternalApiError, R> =>
  effect.pipe(
    Effect.tapError((error) => Effect.logError('Repository operation failed', error)),
    Effect.mapError(() => internalApiError()),
  )

const authorizeProfile = (profileId: string) =>
  Effect.gen(function* () {
    const identity = yield* CurrentIdentity
    const application = yield* ApplicationRepository
    const allowed = yield* fromRepository(
      application.profileBelongsToClerkUser(profileId, identity.userId),
    )
    if (!allowed) return yield* forbiddenError()
  })

const withProfile = <A, E, R>(profileId: string, effect: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    yield* authorizeProfile(profileId)
    return yield* effect
  })

export const systemHandlers = HttpApiBuilder.group(RegolithApi, 'system', (handlers) =>
  handlers.handle('health', () =>
    Effect.gen(function* () {
      const database = yield* DatabaseHealth
      yield* database.check.pipe(
        Effect.tapError((error) => Effect.logError('Database health check failed', error)),
        Effect.mapError(() => serviceUnavailableError('Database unavailable')),
      )
      return { service: 'api' as const, status: 'ok' as const, version: '0.1.0' }
    }),
  ),
)

export const catalogHandlers = HttpApiBuilder.group(RegolithApi, 'catalog', (handlers) =>
  handlers
    .handle('catalogStatus', () =>
      Effect.gen(function* () {
        const catalog = yield* CatalogReader
        const status = yield* fromRepository(catalog.getStatus)
        return {
          ...status,
          completedAt: status.completedAt?.toISOString() ?? null,
        }
      }),
    )
    .handle('foodByGtin', ({ params }) =>
      Effect.gen(function* () {
        const catalog = yield* CatalogReader
        const food = yield* fromRepository(catalog.findByGtin(params.gtin))
        if (food === undefined) {
          return yield* new NotFoundError({
            code: 'food_not_found',
            message: 'No food has that GTIN',
          })
        }
        return toFoodSummary(food)
      }),
    )
    .handle('searchFoods', ({ query }) =>
      Effect.gen(function* () {
        const catalog = yield* CatalogReader
        const foods = yield* fromRepository(
          catalog.search({
            ...(query.kind === undefined ? {} : { kind: query.kind }),
            limit: query.limit ?? 20,
            query: query.q,
          }),
        )
        return { foods: foods.map(toFoodSummary) }
      }),
    ),
)

export const applicationHandlers = HttpApiBuilder.group(RegolithApi, 'application', (handlers) =>
  handlers.handleAll({
    ensureProfile: () =>
      Effect.gen(function* () {
        const identity = yield* CurrentIdentity
        const application = yield* ApplicationRepository
        const profileId = yield* fromRepository(
          application.ensureProfileForClerkUser(identity.userId),
        )
        return { profileId }
      }),
    getNutritionPlan: ({ params }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const application = yield* ApplicationRepository
          const plan = yield* fromRepository(application.getNutritionPlan(params.profileId))
          return { plan: plan === undefined ? null : toNutritionPlan(plan) }
        }),
      ),
    saveNutritionPlan: ({ params, payload }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const application = yield* ApplicationRepository
          const plan = yield* fromRepository(
            application.saveNutritionPlan(params.profileId, payload),
          )
          return toNutritionPlan(plan)
        }),
      ),
    listFoodLog: ({ params, query }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const application = yield* ApplicationRepository
          const entries = yield* fromRepository(
            application.listFoodLog(params.profileId, new Date(query.from), new Date(query.to)),
          )
          return { entries: entries.map(toFoodLogEntry) }
        }),
      ),
    saveFoodLogEntry: ({ params, payload }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const application = yield* ApplicationRepository
          const entry = yield* fromRepository(
            application.saveFoodLogEntry(params.profileId, {
              ...payload,
              loggedAt: new Date(payload.loggedAt),
            }),
          )
          if (entry === undefined) {
            return yield* new NotFoundError({
              code: 'food_not_found',
              message: 'Food not found in the active catalog',
            })
          }
          return toFoodLogEntry(entry)
        }),
      ),
    deleteFoodLogEntry: ({ params }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const application = yield* ApplicationRepository
          const deleted = yield* fromRepository(
            application.deleteFoodLogEntry(params.profileId, params.entryId),
          )
          if (!deleted) {
            return yield* new NotFoundError({
              code: 'entry_not_found',
              message: 'Food log entry not found',
            })
          }
          return HttpApiSchema.NoContent.make()
        }),
      ),
    listMealLogs: ({ params, query }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const logging = yield* MealLogging
          const meals = yield* fromMealLogging(
            logging.list(params.profileId, new Date(query.from), new Date(query.to)),
          )
          return { meals: meals.map(toMealLog) }
        }),
      ),
    saveMealLog: ({ params, payload }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const logging = yield* MealLogging
          return toMealLog(yield* fromMealLogging(logging.save(params.profileId, payload)))
        }),
      ),
    updateMealLog: ({ params, payload }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          if (payload.mealId.toLowerCase() !== params.mealId.toLowerCase())
            return yield* validationError('Invalid meal identifiers')
          const logging = yield* MealLogging
          return toMealLog(yield* fromMealLogging(logging.save(params.profileId, payload)))
        }),
      ),
    deleteMealLog: ({ params }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const logging = yield* MealLogging
          const deleted = yield* fromMealLogging(logging.delete(params.profileId, params.mealId))
          if (!deleted)
            return yield* new NotFoundError({
              code: 'meal_not_found',
              message: 'Meal not found',
            })
          return HttpApiSchema.NoContent.make()
        }),
      ),
    getMealPhoto: ({ params }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const logging = yield* MealLogging
          const photo = yield* fromMealLogging(logging.photo(params.profileId, params.mealId))
          if (photo === undefined)
            return yield* new NotFoundError({
              code: 'meal_photo_not_found',
              message: 'Meal photo not found',
            })
          return photo
        }),
      ),
    describeMeal: ({ params, payload }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const logging = yield* MealLogging
          return { description: yield* fromMealLogging(logging.describe(payload.items)) }
        }),
      ),
    listCustomFoods: ({ params }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const repository = yield* UserFoodRepository
          const foods = yield* fromRepository(repository.listCustomFoods(params.profileId))
          return { foods: foods.map(toCustomFood) }
        }),
      ),
    saveCustomFood: ({ params, payload }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          if (payload.foodId.toLowerCase() !== params.foodId.toLowerCase()) {
            return yield* validationError('Invalid custom food identifiers')
          }
          const repository = yield* UserFoodRepository
          return toCustomFood(
            yield* fromRepository(repository.saveCustomFood(params.profileId, payload)),
          )
        }),
      ),
    deleteCustomFood: ({ params }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const repository = yield* UserFoodRepository
          const deleted = yield* fromRepository(
            repository.deleteCustomFood(params.profileId, params.foodId),
          )
          if (!deleted)
            return yield* new NotFoundError({
              code: 'custom_food_not_found',
              message: 'Custom food not found',
            })
          return HttpApiSchema.NoContent.make()
        }),
      ),
    listRecipes: ({ params }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const repository = yield* UserFoodRepository
          const recipes = yield* fromRepository(repository.listRecipes(params.profileId))
          return { recipes: recipes.map(toRecipe) }
        }),
      ),
    saveRecipe: ({ params, payload }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          if (payload.recipeId.toLowerCase() !== params.recipeId.toLowerCase()) {
            return yield* validationError('Invalid recipe identifiers')
          }
          const repository = yield* UserFoodRepository
          return toRecipe(yield* fromRepository(repository.saveRecipe(params.profileId, payload)))
        }),
      ),
    deleteRecipe: ({ params }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const repository = yield* UserFoodRepository
          const deleted = yield* fromRepository(
            repository.deleteRecipe(params.profileId, params.recipeId),
          )
          if (!deleted)
            return yield* new NotFoundError({
              code: 'recipe_not_found',
              message: 'Recipe not found',
            })
          return HttpApiSchema.NoContent.make()
        }),
      ),
    listWeightLog: ({ params, query }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const application = yield* ApplicationRepository
          const entries = yield* fromRepository(
            application.listWeightLog(params.profileId, new Date(query.from), new Date(query.to)),
          )
          return { entries: entries.map(toWeightLogEntry) }
        }),
      ),
    saveWeightLogEntry: ({ params, payload }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const application = yield* ApplicationRepository
          const entry = yield* fromRepository(
            application.saveWeightLogEntry(params.profileId, {
              ...payload,
              measuredAt: new Date(payload.measuredAt),
            }),
          )
          return toWeightLogEntry(entry)
        }),
      ),
    deleteWeightLogEntry: ({ params }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const application = yield* ApplicationRepository
          const deleted = yield* fromRepository(
            application.deleteWeightLogEntry(params.profileId, params.entryId),
          )
          if (!deleted) {
            return yield* new NotFoundError({
              code: 'weight_not_found',
              message: 'Weight entry not found',
            })
          }
          return HttpApiSchema.NoContent.make()
        }),
      ),
    listWorkouts: ({ params, query }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const application = yield* ApplicationRepository
          const workouts = yield* fromRepository(
            application.listWorkouts(params.profileId, new Date(query.from), new Date(query.to)),
          )
          return { workouts: workouts.map(toWorkout) }
        }),
      ),
    saveWorkout: ({ params, payload }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          if (payload.sessionId.toLowerCase() !== params.sessionId.toLowerCase()) {
            return yield* validationError('Invalid workout identifiers')
          }
          const application = yield* ApplicationRepository
          const workout = yield* fromRepository(
            application.saveWorkout(params.profileId, {
              ...payload,
              completedAt: payload.completedAt === null ? null : new Date(payload.completedAt),
              startedAt: new Date(payload.startedAt),
            }),
          )
          return toWorkout(workout)
        }),
      ),
    deleteWorkout: ({ params }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const application = yield* ApplicationRepository
          const deleted = yield* fromRepository(
            application.deleteWorkout(params.profileId, params.sessionId),
          )
          if (!deleted) {
            return yield* new NotFoundError({
              code: 'workout_not_found',
              message: 'Workout not found',
            })
          }
          return HttpApiSchema.NoContent.make()
        }),
      ),
    listWorkoutTemplates: ({ params }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const application = yield* ApplicationRepository
          const templates = yield* fromRepository(
            application.listWorkoutTemplates(params.profileId),
          )
          return { templates: templates.map(toWorkoutTemplate) }
        }),
      ),
    saveWorkoutTemplate: ({ params, payload }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          if (payload.templateId.toLowerCase() !== params.templateId.toLowerCase()) {
            return yield* validationError('Invalid workout template identifiers')
          }
          const application = yield* ApplicationRepository
          const template = yield* fromRepository(
            application.saveWorkoutTemplate(params.profileId, payload),
          )
          return toWorkoutTemplate(template)
        }),
      ),
    deleteWorkoutTemplate: ({ params }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const application = yield* ApplicationRepository
          const deleted = yield* fromRepository(
            application.deleteWorkoutTemplate(params.profileId, params.templateId),
          )
          if (!deleted) {
            return yield* new NotFoundError({
              code: 'template_not_found',
              message: 'Workout template not found',
            })
          }
          return HttpApiSchema.NoContent.make()
        }),
      ),
    createMealEstimate: ({ params, payload }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const estimation = yield* MealEstimation
          return yield* fromMealEstimation(estimation.create(params.profileId, payload))
        }),
      ),
    getMealEstimate: ({ params }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const estimation = yield* MealEstimation
          const estimate = yield* fromMealEstimation(
            estimation.findById(params.profileId, params.estimateId),
          )
          if (estimate === undefined)
            return yield* new NotFoundError({
              code: 'meal_estimate_not_found',
              message: 'Meal estimate not found',
            })
          return estimate
        }),
      ),
    discardMealEstimate: ({ params }) =>
      withProfile(
        params.profileId,
        Effect.gen(function* () {
          const logging = yield* MealLogging
          const deleted = yield* fromMealLogging(
            logging.discardEstimate(params.profileId, params.estimateId),
          )
          if (!deleted)
            return yield* new NotFoundError({
              code: 'meal_estimate_not_found',
              message: 'Meal estimate not found',
            })
          return HttpApiSchema.NoContent.make()
        }),
      ),
  }),
)

export const handlerLayers = Layer.mergeAll(systemHandlers, catalogHandlers, applicationHandlers)
