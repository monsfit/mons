import type { RegolithApi } from '../api.ts'
import { Authentication, CurrentIdentity } from '../core/auth.ts'
import {
  ForbiddenError,
  InternalApiError,
  NotFoundError,
  RequestValidation,
  ServiceUnavailableError,
  UnauthorizedError,
  ValidationError,
  validationError,
} from '../core/errors.ts'
import { fromProfileService } from '../core/handler-errors.ts'
import {
  type ProfileAccessDenied,
  type ServicePersistenceError,
  fromRepository,
} from '../core/service-errors.ts'
import { ProfileAccessService } from './profile.ts'
import {
  type CustomFood,
  type Recipe,
  customFoodPathSchema,
  customFoodResponseSchema,
  customFoodSchema,
  profilePathSchema,
  recipePathSchema,
  recipeResponseSchema,
  recipeSchema,
  saveCustomFoodSchema,
  saveRecipeSchema,
} from '@regolith/contracts'
import {
  type CustomFoodRecord,
  LibraryRepository,
  type RecipeRecord,
  type SaveCustomFoodInput,
  type SaveRecipeInput,
} from '@regolith/database'
import { Context, Effect, Layer } from 'effect'
import {
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from 'effect/unstable/httpapi'

const profileErrors = [
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  NotFoundError,
  ServiceUnavailableError,
  InternalApiError,
]

export const libraryApi = HttpApiGroup.make('library')
  .add(
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
  )
  .middleware(RequestValidation)
  .middleware(Authentication)

export const libraryHandlers = (api: typeof RegolithApi) =>
  HttpApiBuilder.group(api, 'library', (handlers) =>
    handlers.handleAll({
      listCustomFoods: ({ params }) =>
        Effect.gen(function* () {
          const library = yield* LibraryService
          const identity = yield* CurrentIdentity
          return yield* fromProfileService(
            library.listCustomFoods(params.profileId, identity.userId),
          )
        }),
      saveCustomFood: ({ params, payload }) =>
        Effect.gen(function* () {
          if (payload.foodId.toLowerCase() !== params.foodId.toLowerCase())
            return yield* validationError('Invalid custom food identifiers')
          const library = yield* LibraryService
          const identity = yield* CurrentIdentity
          return yield* fromProfileService(
            library.saveCustomFood(params.profileId, identity.userId, payload),
          )
        }),
      deleteCustomFood: ({ params }) =>
        Effect.gen(function* () {
          const library = yield* LibraryService
          const identity = yield* CurrentIdentity
          const deleted = yield* fromProfileService(
            library.deleteCustomFood(params.profileId, identity.userId, params.foodId),
          )
          if (!deleted)
            return yield* new NotFoundError({
              code: 'custom_food_not_found',
              message: 'Custom food not found',
            })
          return HttpApiSchema.NoContent.make()
        }),
      listRecipes: ({ params }) =>
        Effect.gen(function* () {
          const library = yield* LibraryService
          const identity = yield* CurrentIdentity
          return yield* fromProfileService(library.listRecipes(params.profileId, identity.userId))
        }),
      saveRecipe: ({ params, payload }) =>
        Effect.gen(function* () {
          if (payload.recipeId.toLowerCase() !== params.recipeId.toLowerCase())
            return yield* validationError('Invalid recipe identifiers')
          const library = yield* LibraryService
          const identity = yield* CurrentIdentity
          return yield* fromProfileService(
            library.saveRecipe(params.profileId, identity.userId, payload),
          )
        }),
      deleteRecipe: ({ params }) =>
        Effect.gen(function* () {
          const library = yield* LibraryService
          const identity = yield* CurrentIdentity
          const deleted = yield* fromProfileService(
            library.deleteRecipe(params.profileId, identity.userId, params.recipeId),
          )
          if (!deleted)
            return yield* new NotFoundError({
              code: 'recipe_not_found',
              message: 'Recipe not found',
            })
          return HttpApiSchema.NoContent.make()
        }),
    }),
  )

export const toCustomFood = (record: CustomFoodRecord): CustomFood => ({
  barcode: record.food.barcode,
  brand: record.food.brand,
  calories: record.food.calories_per_100g,
  carbohydrates: record.food.carbohydrates_per_100g,
  foodId: record.food.food_id,
  imageDataBase64: record.food.image_data_base64,
  name: record.food.name,
  nutritionLabelImageDataBase64: record.food.nutrition_label_image_data_base64,
  portions: record.portions.map((portion) => ({
    amount: portion.amount,
    name: portion.name,
    unit: portion.unit,
  })),
  protein: record.food.protein_per_100g,
  sourceKind: 'custom',
  totalFat: record.food.fat_per_100g,
})

export const toRecipe = (record: RecipeRecord): Recipe => ({
  calories: record.recipe.calories_per_100g,
  carbohydrates: record.recipe.carbohydrates_per_100g,
  freeformIngredients: record.freeformIngredients.map((item) => ({
    calories: item.calories,
    carbohydrates: item.carbohydrates,
    ingredientId: item.ingredient_id,
    name: item.name,
    protein: item.protein,
    quantity: item.quantity,
    text: item.text,
    totalFat: item.total_fat,
    unit: item.unit,
  })),
  imageDataBase64: record.recipe.image_data_base64,
  ingredients: record.ingredients.map((item) => ({
    calories: item.calories_per_100g,
    carbohydrates: item.carbohydrates_per_100g,
    foodId: item.food_id,
    ingredientId: item.ingredient_id,
    name: item.name,
    protein: item.protein_per_100g,
    quantityGrams: item.quantity_grams,
    sourceKind: item.source_kind,
    totalFat: item.fat_per_100g,
  })),
  name: record.recipe.name,
  notes: record.recipe.notes,
  nutritionStatus: record.recipe.nutrition_status,
  protein: record.recipe.protein_per_100g,
  recipeId: record.recipe.recipe_id,
  servings: record.recipe.servings,
  sourceKind: 'recipe',
  totalFat: record.recipe.fat_per_100g,
  totalYieldGrams: record.recipe.total_yield_grams,
})

export interface NutritionValues {
  readonly calories: number | null
  readonly carbohydrates: number | null
  readonly protein: number | null
  readonly totalFat: number | null
}

export interface WeightedNutritionValues extends NutritionValues {
  readonly quantityGrams: number
}

export interface RecipeNutrition extends NutritionValues {
  readonly status: 'calculated' | 'estimate_pending' | 'mixed'
}

const nutritionFields = ['calories', 'carbohydrates', 'protein', 'totalFat'] as const

export const calculateRecipeNutrition = (
  ingredients: ReadonlyArray<WeightedNutritionValues>,
  freeformEstimates: ReadonlyArray<NutritionValues>,
  totalYieldGrams: number,
): RecipeNutrition => {
  const hasPendingEstimate = freeformEstimates.some((estimate) =>
    nutritionFields.some((field) => estimate[field] === null),
  )
  const total = (field: (typeof nutritionFields)[number]): number | null => {
    const ingredientValues = ingredients.map((ingredient) => {
      const value = ingredient[field]
      return value === null ? null : (value * ingredient.quantityGrams) / 100
    })
    const freeformValues = freeformEstimates.map((estimate) => estimate[field])
    const values = [...ingredientValues, ...freeformValues]
    if (values.some((value) => value === null)) return null
    const sum = values.reduce<number>((result, value) => result + (value ?? 0), 0)
    return Math.round(((sum * 100) / totalYieldGrams) * 1000) / 1000
  }

  const nutrition: NutritionValues = {
    calories: total('calories'),
    carbohydrates: total('carbohydrates'),
    protein: total('protein'),
    totalFat: total('totalFat'),
  }

  return {
    ...nutrition,
    status:
      freeformEstimates.length === 0
        ? 'calculated'
        : hasPendingEstimate
          ? 'estimate_pending'
          : 'mixed',
  }
}

type LibraryServiceError = ProfileAccessDenied | ServicePersistenceError

type RecipePayload = Omit<SaveRecipeInput, 'nutrition'>

export interface LibraryServiceShape {
  readonly deleteCustomFood: (
    profileId: string,
    clerkUserId: string,
    foodId: string,
  ) => Effect.Effect<boolean, LibraryServiceError>
  readonly deleteRecipe: (
    profileId: string,
    clerkUserId: string,
    recipeId: string,
  ) => Effect.Effect<boolean, LibraryServiceError>
  readonly listCustomFoods: (
    profileId: string,
    clerkUserId: string,
  ) => Effect.Effect<{ readonly foods: ReadonlyArray<CustomFood> }, LibraryServiceError>
  readonly listRecipes: (
    profileId: string,
    clerkUserId: string,
  ) => Effect.Effect<{ readonly recipes: ReadonlyArray<Recipe> }, LibraryServiceError>
  readonly saveCustomFood: (
    profileId: string,
    clerkUserId: string,
    input: SaveCustomFoodInput,
  ) => Effect.Effect<CustomFood, LibraryServiceError>
  readonly saveRecipe: (
    profileId: string,
    clerkUserId: string,
    input: RecipePayload,
  ) => Effect.Effect<Recipe, LibraryServiceError>
}

export const LibraryService = Context.Service<LibraryServiceShape>('@regolith/api/LibraryService')

export const libraryServiceLayer = Layer.effect(
  LibraryService,
  Effect.gen(function* () {
    const access = yield* ProfileAccessService
    const repository = yield* LibraryRepository
    return LibraryService.of({
      deleteCustomFood: Effect.fn('LibraryService.deleteCustomFood')(
        function* (profileId, clerkUserId, foodId) {
          yield* access.authorize(profileId, clerkUserId)
          return yield* fromRepository(
            'LibraryRepository.deleteCustomFood',
            repository.deleteCustomFood(profileId, foodId),
          )
        },
      ),
      deleteRecipe: Effect.fn('LibraryService.deleteRecipe')(
        function* (profileId, clerkUserId, recipeId) {
          yield* access.authorize(profileId, clerkUserId)
          return yield* fromRepository(
            'LibraryRepository.deleteRecipe',
            repository.deleteRecipe(profileId, recipeId),
          )
        },
      ),
      listCustomFoods: Effect.fn('LibraryService.listCustomFoods')(
        function* (profileId, clerkUserId) {
          yield* access.authorize(profileId, clerkUserId)
          const foods = yield* fromRepository(
            'LibraryRepository.listCustomFoods',
            repository.listCustomFoods(profileId),
          )
          return { foods: foods.map(toCustomFood) }
        },
      ),
      listRecipes: Effect.fn('LibraryService.listRecipes')(function* (profileId, clerkUserId) {
        yield* access.authorize(profileId, clerkUserId)
        const recipes = yield* fromRepository(
          'LibraryRepository.listRecipes',
          repository.listRecipes(profileId),
        )
        return { recipes: recipes.map(toRecipe) }
      }),
      saveCustomFood: Effect.fn('LibraryService.saveCustomFood')(
        function* (profileId, clerkUserId, input) {
          yield* access.authorize(profileId, clerkUserId)
          return toCustomFood(
            yield* fromRepository(
              'LibraryRepository.saveCustomFood',
              repository.saveCustomFood(profileId, input),
            ),
          )
        },
      ),
      saveRecipe: Effect.fn('LibraryService.saveRecipe')(function* (profileId, clerkUserId, input) {
        yield* access.authorize(profileId, clerkUserId)
        const nutrition = calculateRecipeNutrition(
          input.ingredients,
          input.freeformIngredients,
          input.totalYieldGrams,
        )
        return toRecipe(
          yield* fromRepository(
            'LibraryRepository.saveRecipe',
            repository.saveRecipe(profileId, { ...input, nutrition }),
          ),
        )
      }),
    })
  }),
)
