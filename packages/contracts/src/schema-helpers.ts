import { Schema } from 'effect'

export const identifier =
  <S extends Schema.Top>(name: string, description?: string) =>
  (schema: S) =>
    schema.annotate({ identifier: name, ...(description === undefined ? {} : { description }) })

export const boundedNumber = (minimum: number, maximum: number) =>
  Schema.Finite.check(Schema.isBetween({ minimum, maximum }))

export const boundedInteger = (minimum: number, maximum: number) =>
  Schema.Int.check(Schema.isBetween({ minimum, maximum }))

export const nonBlankTextSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(200),
)

export const uuidSchema = Schema.String.check(Schema.isUUID())

export const isoTimestampSchema = Schema.String.annotate({ format: 'date-time' }).check(
  Schema.makeFilter((value) => !Number.isNaN(Date.parse(value)), {
    expected: 'an ISO-8601 timestamp',
  }),
)

export const foodSourceKindSchema = Schema.Literals([
  'raw',
  'branded',
  'restaurant',
  'custom',
  'recipe',
])
export const mealCategorySchema = Schema.Literals(['breakfast', 'lunch', 'dinner', 'snack'])

export type FoodSourceKind = typeof foodSourceKindSchema.Type
export type MealCategory = typeof mealCategorySchema.Type
