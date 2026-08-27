import { Schema } from 'effect'

import { boundedNumber, identifier, isoTimestampSchema } from '../../schema-helpers.ts'

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

export type DailyActivity = typeof dailyActivitySchema.Type
export type ExerciseFrequency = typeof exerciseFrequencySchema.Type
export type MetabolicSex = typeof metabolicSexSchema.Type
export type NutritionPlan = typeof nutritionPlanSchema.Type
export type SaveNutritionPlan = typeof saveNutritionPlanSchema.Type
export type WeightGoal = typeof weightGoalSchema.Type
