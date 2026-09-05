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

export const catalogDatasetKindSchema = Schema.Literals(['raw', 'branded', 'restaurant'])
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

export const catalogDimensionIdSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(19),
  Schema.isPattern(/^[1-9]\d*$/),
)

export const foodSearchQuerySchema = Schema.Struct({
  brandId: Schema.optionalKey(catalogDimensionIdSchema),
  foodGroupId: Schema.optionalKey(catalogDimensionIdSchema),
  kind: Schema.optionalKey(catalogDatasetKindSchema),
  limit: Schema.optionalKey(
    Schema.NumberFromString.check(Schema.isInt(), Schema.isBetween({ minimum: 1, maximum: 100 })),
  ),
  q: Schema.String.check(Schema.isMinLength(2), Schema.isMaxLength(200)),
})

export const brandListQuerySchema = Schema.Struct({
  limit: Schema.optionalKey(
    Schema.NumberFromString.check(Schema.isInt(), Schema.isBetween({ minimum: 1, maximum: 100 })),
  ),
  q: Schema.optionalKey(Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(200))),
})

export const foodGroupSchema = Schema.Struct({
  foodCount: Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  foodGroupId: catalogDimensionIdSchema,
  name: nonBlankTextSchema,
  slug: nonBlankTextSchema,
}).pipe(identifier('FoodGroup'))

export const brandSchema = Schema.Struct({
  brandId: catalogDimensionIdSchema,
  foodCount: Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  name: nonBlankTextSchema,
}).pipe(identifier('Brand'))

export const foodPortionSchema = Schema.Struct({
  amount: Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0.1)),
  name: nonBlankTextSchema,
  unit: Schema.Literals(['g', 'ml']),
}).pipe(identifier('FoodPortion', 'Normalized household portion'))

export const catalogFoodPortionSchema = Schema.Struct({
  amount: Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0.1)),
  name: nonBlankTextSchema,
  unit: Schema.Literals(['g', 'ml', 'serving']),
}).pipe(identifier('CatalogFoodPortion', 'Normalized catalog portion'))

export const nutrientBasisSchema = Schema.Struct({
  amount: Schema.Finite.check(Schema.isGreaterThan(0)),
  unit: Schema.Literals(['g', 'serving']),
}).pipe(identifier('NutrientBasis', 'Quantity represented by the nutrient values'))

export const foodNutrientSchema = Schema.Struct({
  amount: Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0)),
  field: nonBlankTextSchema,
  name: nonBlankTextSchema,
  unit: nonBlankTextSchema,
}).pipe(identifier('FoodNutrient', 'Available normalized nutrient value for the food basis'))

export const foodSummarySchema = Schema.Struct({
  brand: Schema.NullOr(Schema.String),
  brandId: Schema.NullOr(catalogDimensionIdSchema),
  calories: Schema.NullOr(Schema.Number),
  carbohydrates: Schema.NullOr(Schema.Number),
  datasetKind: catalogDatasetKindSchema,
  foodId: Schema.String,
  foodGroup: Schema.String,
  foodGroupId: catalogDimensionIdSchema,
  foodSubgroup: Schema.NullOr(Schema.String),
  foodSubgroupId: Schema.NullOr(catalogDimensionIdSchema),
  gtin: Schema.NullOr(Schema.String),
  name: Schema.String,
  nutrientBasis: nutrientBasisSchema,
  nutrients: Schema.Array(foodNutrientSchema),
  portions: Schema.Array(catalogFoodPortionSchema),
  protein: Schema.NullOr(Schema.Number),
  restaurant: Schema.NullOr(Schema.String),
  restaurantId: Schema.NullOr(catalogDimensionIdSchema),
  source: Schema.String,
  sourceId: Schema.String,
  totalFat: Schema.NullOr(Schema.Number),
}).pipe(identifier('FoodSummary', 'Snapshot-scoped normalized food summary'))

export const foodSearchResultSchema = Schema.Struct({
  brand: Schema.NullOr(Schema.String),
  brandId: Schema.NullOr(catalogDimensionIdSchema),
  calories: Schema.NullOr(Schema.Number),
  carbohydrates: Schema.NullOr(Schema.Number),
  datasetKind: catalogDatasetKindSchema,
  defaultPortion: Schema.NullOr(catalogFoodPortionSchema),
  foodId: Schema.String,
  foodGroup: Schema.String,
  foodGroupId: catalogDimensionIdSchema,
  foodSubgroup: Schema.NullOr(Schema.String),
  foodSubgroupId: Schema.NullOr(catalogDimensionIdSchema),
  name: Schema.String,
  nutrientBasis: nutrientBasisSchema,
  protein: Schema.NullOr(Schema.Number),
  restaurant: Schema.NullOr(Schema.String),
  restaurantId: Schema.NullOr(catalogDimensionIdSchema),
  source: Schema.String,
  sourceId: Schema.String,
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

export const foodGroupsResponseSchema = Schema.Struct({
  catalogReleaseId: catalogReleaseIdSchema,
  foodGroups: Schema.Array(foodGroupSchema),
}).pipe(identifier('FoodGroupsResponse'))

export const brandsResponseSchema = Schema.Struct({
  brands: Schema.Array(brandSchema),
  catalogReleaseId: catalogReleaseIdSchema,
}).pipe(identifier('BrandsResponse'))

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
export type Brand = typeof brandSchema.Type
export type BrandsResponse = typeof brandsResponseSchema.Type
export type FoodLogEntry = typeof foodLogEntrySchema.Type
export type FoodNutrient = typeof foodNutrientSchema.Type
export type FoodPortion = typeof foodPortionSchema.Type
export type FoodItemResponse = typeof foodItemResponseSchema.Type
export type NutrientBasis = typeof nutrientBasisSchema.Type
export type FoodSearchQuery = typeof foodSearchQuerySchema.Type
export type FoodSearchResult = typeof foodSearchResultSchema.Type
export type FoodSearchResponse = typeof foodSearchResponseSchema.Type
export type FoodSummary = typeof foodSummarySchema.Type
export type FoodGroup = typeof foodGroupSchema.Type
export type FoodGroupsResponse = typeof foodGroupsResponseSchema.Type
