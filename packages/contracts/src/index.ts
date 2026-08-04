import * as v from 'valibot'

export const datasetKindSchema = v.picklist(['raw', 'branded'])

export const healthSchema = v.pipe(
  v.object({
    service: v.literal('api'),
    status: v.literal('ok'),
    version: v.string(),
  }),
  v.description('API health status'),
  v.metadata({ ref: 'Health' }),
)

export const catalogStatusSchema = v.pipe(
  v.object({
    active: v.boolean(),
    brandedFoods: v.pipe(v.number(), v.integer(), v.minValue(0)),
    completedAt: v.nullable(v.string()),
    rawFoods: v.pipe(v.number(), v.integer(), v.minValue(0)),
    schemaVersion: v.nullable(v.string()),
    snapshotId: v.nullable(v.string()),
  }),
  v.description('Active catalog snapshot status'),
  v.metadata({ ref: 'CatalogStatus' }),
)

export const foodSummarySchema = v.pipe(
  v.object({
    brand: v.nullable(v.string()),
    calories: v.nullable(v.number()),
    datasetKind: datasetKindSchema,
    foodId: v.string(),
    gtin: v.nullable(v.string()),
    name: v.string(),
    protein: v.nullable(v.number()),
    source: v.string(),
    sourceId: v.string(),
    totalFat: v.nullable(v.number()),
  }),
  v.description('Snapshot-scoped normalized food summary'),
  v.metadata({ ref: 'FoodSummary' }),
)

export const foodSearchResponseSchema = v.pipe(
  v.object({
    foods: v.array(foodSummarySchema),
  }),
  v.metadata({ ref: 'FoodSearchResponse' }),
)

export const errorSchema = v.pipe(
  v.object({
    code: v.string(),
    message: v.string(),
  }),
  v.metadata({ ref: 'Error' }),
)

export const gtinPathSchema = v.object({
  gtin: v.pipe(v.string(), v.regex(/^\d{14}$/, 'GTIN must contain exactly 14 digits')),
})

export const foodSearchQuerySchema = v.object({
  kind: v.optional(datasetKindSchema),
  limit: v.optional(
    v.pipe(
      v.string(),
      v.regex(/^\d+$/, 'Limit must be an integer'),
      v.transform(Number),
      v.integer(),
      v.minValue(1),
      v.maxValue(100),
    ),
  ),
  q: v.pipe(v.string(), v.minLength(2), v.maxLength(200)),
})

export type CatalogStatus = v.InferOutput<typeof catalogStatusSchema>
export type DatasetKind = v.InferOutput<typeof datasetKindSchema>
export type FoodSearchQuery = v.InferOutput<typeof foodSearchQuerySchema>
export type FoodSummary = v.InferOutput<typeof foodSummarySchema>
export type Health = v.InferOutput<typeof healthSchema>
