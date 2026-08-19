import { Schema } from 'effect'

import { foodLogEntrySchema } from './food-contracts.ts'
import {
  boundedInteger,
  boundedNumber,
  foodSourceKindSchema,
  identifier,
  isoTimestampSchema,
  mealCategorySchema,
  nonBlankTextSchema,
  uuidSchema,
} from './schema-helpers.ts'

export const mealEstimateInputKindSchema = Schema.Literals(['text', 'photo', 'voice'])
export const mealEstimateStatusSchema = Schema.Literals(['completed', 'failed'])
export const mealEstimateMediaTypeSchema = Schema.Literals([
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/m4a',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/webm',
])

const mealEstimateRequestFields = {
  estimateId: uuidSchema,
  retainMedia: Schema.optionalKey(Schema.Boolean),
}

export const createTextMealEstimateSchema = Schema.Struct({
  ...mealEstimateRequestFields,
  description: Schema.String.check(Schema.isMinLength(2), Schema.isMaxLength(10_000)),
  kind: Schema.Literal('text'),
}).pipe(identifier('CreateTextMealEstimate'))

const encodedMediaSchema = Schema.String.check(
  Schema.isMinLength(4),
  Schema.isMaxLength(40_000_000),
)

export const createPhotoMealEstimateSchema = Schema.Struct({
  ...mealEstimateRequestFields,
  dataBase64: encodedMediaSchema,
  description: Schema.optionalKey(
    Schema.String.check(Schema.isMinLength(2), Schema.isMaxLength(10_000)),
  ),
  kind: Schema.Literal('photo'),
  mediaType: Schema.Literals(['image/jpeg', 'image/png', 'image/webp']),
}).pipe(identifier('CreatePhotoMealEstimate'))

export const createVoiceMealEstimateSchema = Schema.Struct({
  ...mealEstimateRequestFields,
  dataBase64: encodedMediaSchema,
  kind: Schema.Literal('voice'),
  mediaType: Schema.Literals(['audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/webm']),
}).pipe(identifier('CreateVoiceMealEstimate'))

export const createMealEstimateSchema = Schema.Union([
  createTextMealEstimateSchema,
  createPhotoMealEstimateSchema,
  createVoiceMealEstimateSchema,
]).pipe(identifier('CreateMealEstimate'))

const mealEstimateNutritionFields = {
  calories: Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0)),
  carbohydrates: Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0)),
  protein: Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0)),
  totalFat: Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0)),
}

export const mealEstimateItemSchema = Schema.Struct({
  ...mealEstimateNutritionFields,
  amountGrams: boundedNumber(0.1, 100_000),
  confidence: boundedNumber(0, 1),
  description: nonBlankTextSchema,
  evidence: Schema.String.check(Schema.isMaxLength(1_000)),
  foodId: Schema.NullOr(Schema.String),
  name: nonBlankTextSchema,
  ordinal: boundedInteger(0, 500),
  resolved: Schema.Boolean,
  sourceKind: Schema.NullOr(foodSourceKindSchema),
}).pipe(identifier('MealEstimateItem'))

export const mealEstimateSchema = Schema.Struct({
  ...mealEstimateNutritionFields,
  createdAt: isoTimestampSchema,
  description: Schema.String.check(Schema.isMaxLength(20_000)),
  estimateId: uuidSchema,
  inputKind: mealEstimateInputKindSchema,
  items: Schema.Array(mealEstimateItemSchema).check(Schema.isMaxLength(500)),
  mediaRetained: Schema.Boolean,
  overallConfidence: boundedNumber(0, 1),
  status: mealEstimateStatusSchema,
  transcript: Schema.NullOr(Schema.String.check(Schema.isMaxLength(20_000))),
  unresolvedItems: Schema.Array(nonBlankTextSchema).check(Schema.isMaxLength(500)),
}).pipe(identifier('MealEstimate'))

export const mealEstimatePathSchema = Schema.Struct({
  estimateId: uuidSchema,
  profileId: uuidSchema,
})

export const mealLogPathSchema = Schema.Struct({ mealId: uuidSchema, profileId: uuidSchema })

export const mealLogItemInputSchema = Schema.Struct({
  datasetKind: foodSourceKindSchema,
  entryId: uuidSchema,
  foodId: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(100)),
  quantityGrams: boundedNumber(0.1, 100_000),
}).pipe(identifier('MealLogItemInput'))

const mealLogFields = {
  description: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(200)),
  estimateId: Schema.NullOr(uuidSchema),
  loggedAt: isoTimestampSchema,
  mealCategory: mealCategorySchema,
  mealId: uuidSchema,
}

export const saveMealLogSchema = Schema.Struct({
  ...mealLogFields,
  items: Schema.Array(mealLogItemInputSchema).check(Schema.isMinLength(1), Schema.isMaxLength(100)),
  photoDataBase64: Schema.optionalKey(encodedMediaSchema),
  photoMediaType: Schema.optionalKey(Schema.Literal('image/jpeg')),
}).pipe(identifier('SaveMealLog'))

export const mealLogSchema = Schema.Struct({
  ...mealLogFields,
  calories: Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0)),
  carbohydrates: Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0)),
  inputKind: Schema.NullOr(mealEstimateInputKindSchema),
  items: Schema.Array(foodLogEntrySchema).check(Schema.isMinLength(1), Schema.isMaxLength(100)),
  photoAvailable: Schema.Boolean,
  protein: Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0)),
  totalFat: Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0)),
}).pipe(identifier('MealLog'))

export const mealLogResponseSchema = Schema.Struct({ meals: Schema.Array(mealLogSchema) }).pipe(
  identifier('MealLogResponse'),
)

export const mealDescriptionRequestSchema = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      name: nonBlankTextSchema,
      quantityGrams: boundedNumber(0.1, 100_000),
    }),
  ).check(Schema.isMinLength(1), Schema.isMaxLength(100)),
}).pipe(identifier('MealDescriptionRequest'))

export const mealDescriptionResponseSchema = Schema.Struct({
  description: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(200)),
}).pipe(identifier('MealDescriptionResponse'))

export const mealPhotoResponseSchema = Schema.Struct({
  dataBase64: encodedMediaSchema,
  mediaType: Schema.Literal('image/jpeg'),
}).pipe(identifier('MealPhotoResponse'))

export type CreateMealEstimate = typeof createMealEstimateSchema.Type
export type MealEstimate = typeof mealEstimateSchema.Type
export type MealEstimateInputKind = typeof mealEstimateInputKindSchema.Type
export type MealEstimateItem = typeof mealEstimateItemSchema.Type
export type MealLog = typeof mealLogSchema.Type
export type MealLogItemInput = typeof mealLogItemInputSchema.Type
export type SaveMealLog = typeof saveMealLogSchema.Type
