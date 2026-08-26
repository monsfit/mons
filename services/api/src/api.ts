import {
  catalogStatusSchema,
  customFoodPathSchema,
  customFoodResponseSchema,
  customFoodSchema,
  createFoodLogEntrySchema,
  createWeightLogEntrySchema,
  foodLogEntryPathSchema,
  foodLogEntrySchema,
  foodLogResponseSchema,
  foodSearchQuerySchema,
  foodSearchResponseSchema,
  foodSummarySchema,
  gtinPathSchema,
  healthSchema,
  nutritionPlanResponseSchema,
  nutritionPlanSchema,
  createMealEstimateSchema,
  mealEstimatePathSchema,
  mealEstimateSchema,
  mealDescriptionRequestSchema,
  mealDescriptionResponseSchema,
  mealLogPathSchema,
  mealLogResponseSchema,
  mealLogSchema,
  mealPhotoResponseSchema,
  profilePathSchema,
  profileSchema,
  recipePathSchema,
  recipeResponseSchema,
  recipeSchema,
  saveCustomFoodSchema,
  saveNutritionPlanSchema,
  saveRecipeSchema,
  saveMealLogSchema,
  saveWorkoutSchema,
  saveWorkoutTemplateSchema,
  timeRangeQuerySchema,
  weightLogEntryPathSchema,
  weightLogEntrySchema,
  weightLogResponseSchema,
  workoutPathSchema,
  workoutResponseSchema,
  workoutSchema,
  workoutTemplatePathSchema,
  workoutTemplateResponseSchema,
  workoutTemplateSchema,
} from '@regolith/contracts'
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from 'effect/unstable/httpapi'

import { Authentication } from './auth.ts'
import {
  ForbiddenError,
  InternalApiError,
  NotFoundError,
  RequestValidation,
  ServiceUnavailableError,
  UnauthorizedError,
  ValidationError,
} from './errors.ts'

const protectedErrors = [UnauthorizedError, InternalApiError]
const profileErrors = [
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  NotFoundError,
  ServiceUnavailableError,
  InternalApiError,
]
const createdFoodLogEntrySchema = foodLogEntrySchema.pipe(HttpApiSchema.status(201))
const createdWeightLogEntrySchema = weightLogEntrySchema.pipe(HttpApiSchema.status(201))
const createdMealEstimateSchema = mealEstimateSchema.pipe(HttpApiSchema.status(201))
const createdMealLogSchema = mealLogSchema.pipe(HttpApiSchema.status(201))

const system = HttpApiGroup.make('system').add(
  HttpApiEndpoint.get('health', '/health', {
    success: healthSchema,
    error: ServiceUnavailableError,
  }),
)

const catalog = HttpApiGroup.make('catalog')
  .add(
    HttpApiEndpoint.get('catalogStatus', '/v1/catalog', {
      success: catalogStatusSchema,
      error: protectedErrors,
    }),
    HttpApiEndpoint.get('foodByGtin', '/v1/foods/by-gtin/:gtin', {
      params: gtinPathSchema,
      success: foodSummarySchema,
      error: [UnauthorizedError, NotFoundError, InternalApiError],
    }),
    HttpApiEndpoint.get('searchFoods', '/v1/foods/search', {
      query: foodSearchQuerySchema,
      success: foodSearchResponseSchema,
      error: protectedErrors,
    }),
  )
  .middleware(RequestValidation)
  .middleware(Authentication)

const application = HttpApiGroup.make('application')
  .add(
    HttpApiEndpoint.put('ensureProfile', '/v1/profile', {
      success: profileSchema,
      error: protectedErrors,
    }),
    HttpApiEndpoint.get('getNutritionPlan', '/v1/profiles/:profileId/nutrition-plan', {
      params: profilePathSchema,
      success: nutritionPlanResponseSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.put('saveNutritionPlan', '/v1/profiles/:profileId/nutrition-plan', {
      params: profilePathSchema,
      payload: saveNutritionPlanSchema,
      success: nutritionPlanSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.get('listFoodLog', '/v1/profiles/:profileId/food-log', {
      params: profilePathSchema,
      query: timeRangeQuerySchema,
      success: foodLogResponseSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.post('saveFoodLogEntry', '/v1/profiles/:profileId/food-log', {
      params: profilePathSchema,
      payload: createFoodLogEntrySchema,
      success: createdFoodLogEntrySchema,
      error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
    }),
    HttpApiEndpoint.delete('deleteFoodLogEntry', '/v1/profiles/:profileId/food-log/:entryId', {
      params: foodLogEntryPathSchema,
      error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
    }),
    HttpApiEndpoint.get('listMealLogs', '/v1/profiles/:profileId/meal-logs', {
      params: profilePathSchema,
      query: timeRangeQuerySchema,
      success: mealLogResponseSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.post('saveMealLog', '/v1/profiles/:profileId/meal-logs', {
      params: profilePathSchema,
      payload: saveMealLogSchema,
      success: createdMealLogSchema,
      error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
    }),
    HttpApiEndpoint.put('updateMealLog', '/v1/profiles/:profileId/meal-logs/:mealId', {
      params: mealLogPathSchema,
      payload: saveMealLogSchema,
      success: mealLogSchema,
      error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
    }),
    HttpApiEndpoint.delete('deleteMealLog', '/v1/profiles/:profileId/meal-logs/:mealId', {
      params: mealLogPathSchema,
      error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
    }),
    HttpApiEndpoint.get('getMealPhoto', '/v1/profiles/:profileId/meal-logs/:mealId/photo', {
      params: mealLogPathSchema,
      success: mealPhotoResponseSchema,
      error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
    }),
    HttpApiEndpoint.post('describeMeal', '/v1/profiles/:profileId/meal-descriptions', {
      params: profilePathSchema,
      payload: mealDescriptionRequestSchema,
      success: mealDescriptionResponseSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.get('listCustomFoods', '/v1/profiles/:profileId/custom-foods', {
      params: profilePathSchema,
      success: customFoodResponseSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.put('saveCustomFood', '/v1/profiles/:profileId/custom-foods/:foodId', {
      params: customFoodPathSchema,
      payload: saveCustomFoodSchema,
      success: customFoodSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.delete('deleteCustomFood', '/v1/profiles/:profileId/custom-foods/:foodId', {
      params: customFoodPathSchema,
      error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
    }),
    HttpApiEndpoint.get('listRecipes', '/v1/profiles/:profileId/recipes', {
      params: profilePathSchema,
      success: recipeResponseSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.put('saveRecipe', '/v1/profiles/:profileId/recipes/:recipeId', {
      params: recipePathSchema,
      payload: saveRecipeSchema,
      success: recipeSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.delete('deleteRecipe', '/v1/profiles/:profileId/recipes/:recipeId', {
      params: recipePathSchema,
      error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
    }),
    HttpApiEndpoint.get('listWeightLog', '/v1/profiles/:profileId/weight-log', {
      params: profilePathSchema,
      query: timeRangeQuerySchema,
      success: weightLogResponseSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.post('saveWeightLogEntry', '/v1/profiles/:profileId/weight-log', {
      params: profilePathSchema,
      payload: createWeightLogEntrySchema,
      success: createdWeightLogEntrySchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.delete('deleteWeightLogEntry', '/v1/profiles/:profileId/weight-log/:entryId', {
      params: weightLogEntryPathSchema,
      error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
    }),
    HttpApiEndpoint.get('listWorkouts', '/v1/profiles/:profileId/workouts', {
      params: profilePathSchema,
      query: timeRangeQuerySchema,
      success: workoutResponseSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.put('saveWorkout', '/v1/profiles/:profileId/workouts/:sessionId', {
      params: workoutPathSchema,
      payload: saveWorkoutSchema,
      success: workoutSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.delete('deleteWorkout', '/v1/profiles/:profileId/workouts/:sessionId', {
      params: workoutPathSchema,
      error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
    }),
    HttpApiEndpoint.get('listWorkoutTemplates', '/v1/profiles/:profileId/workout-templates', {
      params: profilePathSchema,
      success: workoutTemplateResponseSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.put(
      'saveWorkoutTemplate',
      '/v1/profiles/:profileId/workout-templates/:templateId',
      {
        params: workoutTemplatePathSchema,
        payload: saveWorkoutTemplateSchema,
        success: workoutTemplateSchema,
        error: profileErrors,
      },
    ),
    HttpApiEndpoint.delete(
      'deleteWorkoutTemplate',
      '/v1/profiles/:profileId/workout-templates/:templateId',
      {
        params: workoutTemplatePathSchema,
        error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
      },
    ),
    HttpApiEndpoint.post('createMealEstimate', '/v1/profiles/:profileId/meal-estimates', {
      params: profilePathSchema,
      payload: createMealEstimateSchema,
      success: createdMealEstimateSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.get('getMealEstimate', '/v1/profiles/:profileId/meal-estimates/:estimateId', {
      params: mealEstimatePathSchema,
      success: mealEstimateSchema,
      error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
    }),
    HttpApiEndpoint.delete(
      'discardMealEstimate',
      '/v1/profiles/:profileId/meal-estimates/:estimateId',
      {
        params: mealEstimatePathSchema,
        error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
      },
    ),
  )
  .middleware(RequestValidation)
  .middleware(Authentication)

export const RegolithApi = HttpApi.make('regolith')
  .add(system)
  .add(catalog)
  .add(application)
  .annotate(OpenApi.Title, 'Regolith API')
  .annotate(OpenApi.Version, '0.1.0')
  .annotate(OpenApi.Description, 'Regolith nutrition and workout API')
