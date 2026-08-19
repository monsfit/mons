import { Schema } from 'effect'

import {
  boundedInteger,
  boundedNumber,
  identifier,
  isoTimestampSchema,
  nonBlankTextSchema,
  uuidSchema,
} from './schema-helpers.ts'

export * from './food-contracts.ts'
export * from './meal-contracts.ts'
export * from './user-food-contracts.ts'
export { foodSourceKindSchema, mealCategorySchema } from './schema-helpers.ts'

export const catalogDatasetKindSchema = Schema.Literals(['raw', 'branded'])
export const datasetKindSchema = catalogDatasetKindSchema
export const workoutKindSchema = Schema.Literals(['strength', 'cardio'])
export const dailyActivitySchema = Schema.Literals([
  'mostly_sedentary',
  'moderately_active',
  'very_active',
])
export const exerciseFrequencySchema = Schema.Literals([
  'none',
  'one_to_three',
  'four_to_six',
  'seven_plus',
])
export const metabolicSexSchema = Schema.Literals(['female', 'male'])
export const weightGoalSchema = Schema.Literals(['lose', 'maintain', 'gain'])

export const healthSchema = Schema.Struct({
  service: Schema.Literal('api'),
  status: Schema.Literal('ok'),
  version: Schema.String,
}).pipe(identifier('Health', 'API health status'))

export const catalogStatusSchema = Schema.Struct({
  active: Schema.Boolean,
  brandedFoods: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  completedAt: Schema.NullOr(Schema.String),
  rawFoods: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  schemaVersion: Schema.NullOr(Schema.String),
  snapshotId: Schema.NullOr(Schema.String),
}).pipe(identifier('CatalogStatus', 'Active catalog snapshot status'))

export const errorSchema = Schema.Struct({
  code: Schema.String,
  message: Schema.String,
}).pipe(identifier('Error'))

export const gtinPathSchema = Schema.Struct({
  gtin: Schema.String.check(Schema.isPattern(/^\d{14}$/)),
})

export const foodSearchQuerySchema = Schema.Struct({
  kind: Schema.optionalKey(catalogDatasetKindSchema),
  limit: Schema.optionalKey(
    Schema.NumberFromString.check(Schema.isInt(), Schema.isBetween({ minimum: 1, maximum: 100 })),
  ),
  q: Schema.String.check(Schema.isMinLength(2), Schema.isMaxLength(200)),
})

export const profilePathSchema = Schema.Struct({ profileId: uuidSchema })
export const foodLogEntryPathSchema = Schema.Struct({ entryId: uuidSchema, profileId: uuidSchema })
export const workoutPathSchema = Schema.Struct({ profileId: uuidSchema, sessionId: uuidSchema })
export const workoutTemplatePathSchema = Schema.Struct({
  profileId: uuidSchema,
  templateId: uuidSchema,
})
export const weightLogEntryPathSchema = Schema.Struct({
  entryId: uuidSchema,
  profileId: uuidSchema,
})

export const timeRangeQuerySchema = Schema.Struct({
  from: isoTimestampSchema,
  to: isoTimestampSchema,
}).check(
  Schema.makeFilter((range) => Date.parse(range.from) < Date.parse(range.to), {
    expected: 'from before to',
  }),
)

export const profileSchema = Schema.Struct({ profileId: uuidSchema }).pipe(identifier('Profile'))

const nutritionPlanFields = {
  birthDate: Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/)),
  currentWeightKg: boundedNumber(30, 350),
  dailyActivity: dailyActivitySchema,
  exerciseFrequency: exerciseFrequencySchema,
  heightCm: boundedNumber(100, 250),
  metabolicSex: metabolicSexSchema,
  targetWeightKg: boundedNumber(30, 350),
  weeklyWeightChangePercent: boundedNumber(0, 1.25),
  weightGoal: weightGoalSchema,
}

export const saveNutritionPlanSchema = Schema.Struct(nutritionPlanFields)
  .check(
    Schema.makeFilter(
      (plan) =>
        (plan.weightGoal === 'lose' && plan.targetWeightKg < plan.currentWeightKg) ||
        (plan.weightGoal === 'gain' && plan.targetWeightKg > plan.currentWeightKg) ||
        (plan.weightGoal === 'maintain' &&
          plan.targetWeightKg === plan.currentWeightKg &&
          plan.weeklyWeightChangePercent === 0),
      { expected: 'a weight target and rate matching the selected goal' },
    ),
    Schema.makeFilter(
      (plan) =>
        plan.weightGoal === 'maintain' ||
        (plan.weeklyWeightChangePercent >= 0.1 && plan.weeklyWeightChangePercent <= 1.25),
      { expected: 'change goals with a weekly rate between 0.1% and 1.25%' },
    ),
  )
  .pipe(identifier('SaveNutritionPlan'))

export const nutritionPlanSchema = Schema.Struct({
  ...nutritionPlanFields,
  calculatedAt: isoTimestampSchema,
  calorieTargetKcal: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1_000)),
  estimatedExpenditureKcal: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  estimatedWeeks: Schema.NullOr(Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0))),
  rateLimited: Schema.Boolean,
  restingEnergyKcal: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
}).pipe(identifier('NutritionPlan'))

export const nutritionPlanResponseSchema = Schema.Struct({
  plan: Schema.NullOr(nutritionPlanSchema),
}).pipe(identifier('NutritionPlanResponse'))

export const createWeightLogEntrySchema = Schema.Struct({
  entryId: uuidSchema,
  measuredAt: isoTimestampSchema,
  weightKg: boundedNumber(30, 350),
}).pipe(identifier('CreateWeightLogEntry'))

export const weightLogEntrySchema = Schema.Struct({
  entryId: uuidSchema,
  measuredAt: isoTimestampSchema,
  weightKg: Schema.Number,
}).pipe(identifier('WeightLogEntry'))

export const weightLogResponseSchema = Schema.Struct({
  entries: Schema.Array(weightLogEntrySchema),
}).pipe(identifier('WeightLogResponse'))

export const workoutSetSchema = Schema.Struct({
  detail: Schema.String.check(Schema.isMaxLength(500)),
  setId: uuidSchema,
  title: nonBlankTextSchema,
  value: Schema.String.check(Schema.isMaxLength(200)),
}).pipe(identifier('WorkoutSet'))

export const saveWorkoutSchema = Schema.Struct({
  completedAt: Schema.NullOr(isoTimestampSchema),
  distanceKilometers: Schema.NullOr(boundedNumber(0, 100_000)),
  durationMinutes: boundedInteger(0, 10_080),
  kind: workoutKindSchema,
  sessionId: uuidSchema,
  sets: Schema.Array(workoutSetSchema).check(Schema.isMaxLength(500)),
  startedAt: isoTimestampSchema,
  title: nonBlankTextSchema,
})
  .check(
    Schema.makeFilter(
      (workout) =>
        workout.completedAt === null ||
        Date.parse(workout.startedAt) <= Date.parse(workout.completedAt),
      { expected: 'completedAt not before startedAt' },
    ),
    Schema.makeFilter(
      (workout) => workout.kind === 'cardio' || workout.distanceKilometers === null,
      { expected: 'distanceKilometers only for cardio workouts' },
    ),
  )
  .pipe(identifier('SaveWorkout'))

export const workoutSchema = Schema.Struct({
  completedAt: Schema.NullOr(isoTimestampSchema),
  distanceKilometers: Schema.NullOr(Schema.Number),
  durationMinutes: Schema.Number,
  kind: workoutKindSchema,
  sessionId: uuidSchema,
  sets: Schema.Array(workoutSetSchema),
  startedAt: isoTimestampSchema,
  title: Schema.String,
}).pipe(identifier('Workout'))

export const workoutResponseSchema = Schema.Struct({ workouts: Schema.Array(workoutSchema) }).pipe(
  identifier('WorkoutResponse'),
)

export const workoutTemplateSetSchema = Schema.Struct({
  repetitions: boundedInteger(0, 1_000),
  restSeconds: boundedInteger(0, 3_600),
  setId: uuidSchema,
  weightPounds: boundedNumber(0, 5_000),
}).pipe(identifier('WorkoutTemplateSet'))

export const workoutTemplateExerciseSchema = Schema.Struct({
  category: nonBlankTextSchema,
  equipment: nonBlankTextSchema,
  exerciseId: nonBlankTextSchema,
  name: nonBlankTextSchema,
  notes: Schema.String.check(Schema.isMaxLength(2_000)),
  sets: Schema.Array(workoutTemplateSetSchema).check(Schema.isMinLength(1), Schema.isMaxLength(50)),
  templateExerciseId: uuidSchema,
}).pipe(identifier('WorkoutTemplateExercise'))

export const workoutTemplateSchema = Schema.Struct({
  exercises: Schema.Array(workoutTemplateExerciseSchema).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(100),
  ),
  name: nonBlankTextSchema,
  templateId: uuidSchema,
}).pipe(identifier('WorkoutTemplate'))

export const saveWorkoutTemplateSchema = workoutTemplateSchema.annotate({
  identifier: 'SaveWorkoutTemplate',
})

export const workoutTemplateResponseSchema = Schema.Struct({
  templates: Schema.Array(workoutTemplateSchema),
}).pipe(identifier('WorkoutTemplateResponse'))

export type CatalogStatus = typeof catalogStatusSchema.Type
export type DailyActivity = typeof dailyActivitySchema.Type
export type DatasetKind = typeof datasetKindSchema.Type
export type ExerciseFrequency = typeof exerciseFrequencySchema.Type
export type FoodSearchQuery = typeof foodSearchQuerySchema.Type
export type Health = typeof healthSchema.Type
export type MetabolicSex = typeof metabolicSexSchema.Type
export type NutritionPlan = typeof nutritionPlanSchema.Type
export type SaveNutritionPlan = typeof saveNutritionPlanSchema.Type
export type SaveWorkout = typeof saveWorkoutSchema.Type
export type WeightGoal = typeof weightGoalSchema.Type
export type WeightLogEntry = typeof weightLogEntrySchema.Type
export type Workout = typeof workoutSchema.Type
export type WorkoutKind = typeof workoutKindSchema.Type
export type WorkoutTemplate = typeof workoutTemplateSchema.Type
export type { FoodSourceKind, MealCategory } from './schema-helpers.ts'
