import { Schema } from 'effect'

import { boundedNumber, identifier, nonBlankTextSchema, uuidSchema } from './schema-helpers.ts'
import { foodPortionSchema } from './food-contracts.ts'

const nullableMacroSchema = Schema.NullOr(boundedNumber(0, 100_000))
const optionalImageDataSchema = Schema.NullOr(Schema.String.check(Schema.isMaxLength(8_000_000)))

const userFoodNutritionFields = {
  calories: nullableMacroSchema,
  carbohydrates: nullableMacroSchema,
  protein: nullableMacroSchema,
  totalFat: nullableMacroSchema,
}

export const customFoodSchema = Schema.Struct({
  ...userFoodNutritionFields,
  barcode: Schema.NullOr(Schema.String.check(Schema.isPattern(/^\d{14}$/))),
  brand: Schema.NullOr(Schema.String.check(Schema.isMaxLength(200))),
  foodId: uuidSchema,
  imageDataBase64: optionalImageDataSchema,
  name: nonBlankTextSchema,
  nutritionLabelImageDataBase64: optionalImageDataSchema,
  portions: Schema.Array(foodPortionSchema).check(Schema.isMaxLength(30)),
  sourceKind: Schema.Literal('custom'),
}).pipe(identifier('CustomFood'))

export const saveCustomFoodSchema = Schema.Struct({
  ...userFoodNutritionFields,
  barcode: Schema.NullOr(Schema.String.check(Schema.isPattern(/^\d{14}$/))),
  brand: Schema.NullOr(Schema.String.check(Schema.isMaxLength(200))),
  foodId: uuidSchema,
  imageDataBase64: optionalImageDataSchema,
  name: nonBlankTextSchema,
  nutritionLabelImageDataBase64: optionalImageDataSchema,
  portions: Schema.Array(foodPortionSchema).check(Schema.isMaxLength(30)),
}).pipe(identifier('SaveCustomFood'))

export const customFoodResponseSchema = Schema.Struct({
  foods: Schema.Array(customFoodSchema),
}).pipe(identifier('CustomFoodResponse'))

export const customFoodPathSchema = Schema.Struct({ foodId: uuidSchema, profileId: uuidSchema })

export const recipeIngredientSchema = Schema.Struct({
  ...userFoodNutritionFields,
  foodId: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(100)),
  ingredientId: uuidSchema,
  name: nonBlankTextSchema,
  quantityGrams: boundedNumber(0.1, 100_000),
  sourceKind: Schema.Literals(['raw', 'branded', 'custom']),
}).pipe(identifier('RecipeIngredient'))

export const recipeIngredientUnitSchema = Schema.Literals([
  'can',
  'clove',
  'cup',
  'g',
  'kg',
  'l',
  'ml',
  'oz',
  'piece',
  'pinch',
  'lb',
  'tbsp',
  'tsp',
])

export const freeformRecipeIngredientSchema = Schema.Struct({
  ...userFoodNutritionFields,
  ingredientId: uuidSchema,
  name: Schema.NullOr(nonBlankTextSchema),
  quantity: Schema.NullOr(boundedNumber(0.001, 1_000_000)),
  text: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(2_000)),
  unit: Schema.NullOr(recipeIngredientUnitSchema),
}).pipe(identifier('FreeformRecipeIngredient'))

const recipeFields = {
  freeformIngredients: Schema.Array(freeformRecipeIngredientSchema).check(Schema.isMaxLength(200)),
  imageDataBase64: optionalImageDataSchema,
  ingredients: Schema.Array(recipeIngredientSchema).check(Schema.isMaxLength(200)),
  name: nonBlankTextSchema,
  notes: Schema.String.check(Schema.isMaxLength(10_000)),
  recipeId: uuidSchema,
  servings: Schema.NullOr(boundedNumber(0.1, 10_000)),
  totalYieldGrams: boundedNumber(0.1, 1_000_000),
}

export const saveRecipeSchema = Schema.Struct(recipeFields)
  .check(
    Schema.makeFilter(
      (recipe) => recipe.ingredients.length + recipe.freeformIngredients.length > 0,
      { expected: 'at least one database or freeform ingredient' },
    ),
  )
  .pipe(identifier('SaveRecipe'))

export const recipeSchema = Schema.Struct({
  ...recipeFields,
  ...userFoodNutritionFields,
  nutritionStatus: Schema.Literals(['calculated', 'estimate_pending', 'mixed']),
  sourceKind: Schema.Literal('recipe'),
}).pipe(identifier('Recipe'))

export const recipeResponseSchema = Schema.Struct({
  recipes: Schema.Array(recipeSchema),
}).pipe(identifier('RecipeResponse'))

export const recipePathSchema = Schema.Struct({ profileId: uuidSchema, recipeId: uuidSchema })

export type CustomFood = typeof customFoodSchema.Type
export type Recipe = typeof recipeSchema.Type
