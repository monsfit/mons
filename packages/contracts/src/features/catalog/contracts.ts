import { Schema } from 'effect'

import {
  boundedNumber,
  foodSourceKindSchema,
  identifier,
  isoTimestampSchema,
  mealCategorySchema,
  nonBlankTextSchema,
  uuidSchema,
} from '../../schema-helpers.ts'

export const catalogDatasetKindSchema = Schema.Literals(['raw', 'branded'])
export const datasetKindSchema = catalogDatasetKindSchema

export const gtinPathSchema = Schema.Struct({
  gtin: Schema.String.check(Schema.isPattern(/^\d{14}$/)),
})

export const catalogFoodPathSchema = Schema.Struct({
  datasetKind: catalogDatasetKindSchema,
  foodId: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(19),
    Schema.isPattern(/^[1-9]\d*$/),
  ),
})

export const catalogReleaseIdSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(100),
)

export const foodSearchQuerySchema = Schema.Struct({
  kind: Schema.optionalKey(catalogDatasetKindSchema),
  limit: Schema.optionalKey(
    Schema.NumberFromString.check(Schema.isInt(), Schema.isBetween({ minimum: 1, maximum: 100 })),
  ),
  q: Schema.String.check(Schema.isMinLength(2), Schema.isMaxLength(200)),
})

export const foodPortionSchema = Schema.Struct({
  amount: Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0.1)),
  name: nonBlankTextSchema,
  unit: Schema.Literals(['g', 'ml']),
}).pipe(identifier('FoodPortion', 'Normalized household portion'))

export const foodNutrientSchema = Schema.Struct({
  amount: Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0)),
  field: nonBlankTextSchema,
  name: nonBlankTextSchema,
  unit: nonBlankTextSchema,
}).pipe(identifier('FoodNutrient', 'Available normalized nutrient value per 100 grams'))

export const foodSummarySchema = Schema.Struct({
  brand: Schema.NullOr(Schema.String),
  calories: Schema.NullOr(Schema.Number),
  carbohydrates: Schema.NullOr(Schema.Number),
  datasetKind: foodSourceKindSchema,
  foodId: Schema.String,
  gtin: Schema.NullOr(Schema.String),
  name: Schema.String,
  nutrients: Schema.Array(foodNutrientSchema),
  portions: Schema.Array(foodPortionSchema),
  protein: Schema.NullOr(Schema.Number),
  source: Schema.String,
  sourceId: Schema.String,
  totalFat: Schema.NullOr(Schema.Number),
}).pipe(identifier('FoodSummary', 'Snapshot-scoped normalized food summary'))

export const foodSearchResultSchema = Schema.Struct({
  brand: Schema.NullOr(Schema.String),
  calories: Schema.NullOr(Schema.Number),
  carbohydrates: Schema.NullOr(Schema.Number),
  datasetKind: foodSourceKindSchema,
  defaultPortion: Schema.NullOr(foodPortionSchema),
  foodId: Schema.String,
  name: Schema.String,
  protein: Schema.NullOr(Schema.Number),
  totalFat: Schema.NullOr(Schema.Number),
}).pipe(identifier('FoodSearchResult', 'Minimal food search-list result'))

export const foodSearchResponseSchema = Schema.Struct({
  catalogReleaseId: catalogReleaseIdSchema,
  foods: Schema.Array(foodSearchResultSchema),
}).pipe(identifier('FoodSearchResponse'))

export const foodItemResponseSchema = Schema.Struct({
  catalogReleaseId: catalogReleaseIdSchema,
  food: foodSummarySchema,
}).pipe(identifier('FoodItemResponse'))

export const createFoodLogEntrySchema = Schema.Struct({
  datasetKind: foodSourceKindSchema,
  entryId: uuidSchema,
  foodId: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(100)),
  loggedAt: isoTimestampSchema,
  mealCategory: mealCategorySchema,
  quantityGrams: boundedNumber(0.1, 100_000),
}).pipe(identifier('CreateFoodLogEntry'))

export const foodLogEntrySchema = Schema.Struct({
  brand: Schema.NullOr(Schema.String),
  calories: Schema.NullOr(Schema.Number),
  carbohydrates: Schema.NullOr(Schema.Number),
  datasetKind: foodSourceKindSchema,
  entryId: uuidSchema,
  fat: Schema.NullOr(Schema.Number),
  foodId: Schema.String,
  gtin: Schema.NullOr(Schema.String),
  loggedAt: isoTimestampSchema,
  mealId: uuidSchema,
  mealCategory: mealCategorySchema,
  name: Schema.String,
  protein: Schema.NullOr(Schema.Number),
  quantityGrams: Schema.Number,
}).pipe(identifier('FoodLogEntry'))

export const foodLogResponseSchema = Schema.Struct({
  entries: Schema.Array(foodLogEntrySchema),
}).pipe(identifier('FoodLogResponse'))

export const foodLogEntryPathSchema = Schema.Struct({ entryId: uuidSchema, profileId: uuidSchema })

export type DatasetKind = typeof datasetKindSchema.Type
export type FoodLogEntry = typeof foodLogEntrySchema.Type
export type FoodNutrient = typeof foodNutrientSchema.Type
export type FoodPortion = typeof foodPortionSchema.Type
export type FoodItemResponse = typeof foodItemResponseSchema.Type
export type FoodSearchQuery = typeof foodSearchQuerySchema.Type
export type FoodSearchResult = typeof foodSearchResultSchema.Type
export type FoodSearchResponse = typeof foodSearchResponseSchema.Type
export type FoodSummary = typeof foodSummarySchema.Type
