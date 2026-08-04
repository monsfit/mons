import type { DailyActivity, ExerciseFrequency, MetabolicSex, WeightGoal } from './types.js'

export interface NutritionPlanInput {
  birthDate: string
  currentWeightKg: number
  dailyActivity: DailyActivity
  exerciseFrequency: ExerciseFrequency
  heightCm: number
  metabolicSex: MetabolicSex
  targetWeightKg: number
  weeklyWeightChangePercent: number
  weightGoal: WeightGoal
}

export interface NutritionPlanCalculation extends NutritionPlanInput {
  calculatedAt: Date
  calorieTargetKcal: number
  estimatedExpenditureKcal: number
  estimatedWeeks: number | null
  rateLimited: boolean
  restingEnergyKcal: number
}

const minimumDailyCalories = 1_000
const kilocaloriesPerKilogram = 7_700

const dailyActivityFactor: Record<DailyActivity, number> = {
  mostly_sedentary: 1.4,
  moderately_active: 1.55,
  very_active: 1.7,
}

const exerciseFactor: Record<ExerciseFrequency, number> = {
  none: 0,
  one_to_three: 0.1,
  four_to_six: 0.2,
  seven_plus: 0.3,
}

export function calculateNutritionPlan(
  input: NutritionPlanInput,
  calculatedAt = new Date(),
): NutritionPlanCalculation {
  const age = ageOnDate(input.birthDate, calculatedAt)
  if (age < 18 || age > 120) {
    throw new RangeError('Nutrition planning is available for adults ages 18 through 120')
  }
  validateGoal(input)

  const sexOffset = input.metabolicSex === 'male' ? 5 : -161
  const restingEnergy = 10 * input.currentWeightKg + 6.25 * input.heightCm - 5 * age + sexOffset
  const activityFactor = Math.min(
    dailyActivityFactor[input.dailyActivity] + exerciseFactor[input.exerciseFrequency],
    2.1,
  )
  const estimatedExpenditureKcal = Math.round(restingEnergy * activityFactor)
  const weeklyChangeKg = input.currentWeightKg * (input.weeklyWeightChangePercent / 100)
  const dailyAdjustment = (weeklyChangeKg * kilocaloriesPerKilogram) / 7
  const requestedCalories =
    input.weightGoal === 'lose'
      ? estimatedExpenditureKcal - dailyAdjustment
      : input.weightGoal === 'gain'
        ? estimatedExpenditureKcal + dailyAdjustment
        : estimatedExpenditureKcal
  const calorieTargetKcal = Math.max(minimumDailyCalories, Math.round(requestedCalories))
  const weightChange = Math.abs(input.targetWeightKg - input.currentWeightKg)
  const estimatedWeeks = weeklyChangeKg > 0 ? round(weightChange / weeklyChangeKg, 1) : null

  return {
    ...input,
    calculatedAt,
    calorieTargetKcal,
    estimatedExpenditureKcal,
    estimatedWeeks,
    rateLimited: requestedCalories < minimumDailyCalories,
    restingEnergyKcal: Math.round(restingEnergy),
  }
}

function ageOnDate(birthDate: string, date: Date): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate)
  if (match === null) throw new RangeError('birthDate must use YYYY-MM-DD')

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new RangeError('birthDate must be a valid calendar date')
  }

  let age = date.getUTCFullYear() - year
  const birthdayHasPassed =
    date.getUTCMonth() > month - 1 || (date.getUTCMonth() === month - 1 && date.getUTCDate() >= day)
  if (!birthdayHasPassed) age -= 1
  return age
}

function validateGoal(input: NutritionPlanInput): void {
  if (input.weightGoal === 'lose' && input.targetWeightKg >= input.currentWeightKg) {
    throw new RangeError('A loss goal must be below current weight')
  }
  if (input.weightGoal === 'gain' && input.targetWeightKg <= input.currentWeightKg) {
    throw new RangeError('A gain goal must be above current weight')
  }
  if (input.weightGoal === 'maintain' && input.targetWeightKg !== input.currentWeightKg) {
    throw new RangeError('A maintenance goal must equal current weight')
  }
  if (input.weightGoal === 'maintain' && input.weeklyWeightChangePercent !== 0) {
    throw new RangeError('A maintenance goal must have zero weekly change')
  }
  if (
    input.weightGoal !== 'maintain' &&
    (input.weeklyWeightChangePercent < 0.1 || input.weeklyWeightChangePercent > 1.25)
  ) {
    throw new RangeError('Weekly weight change must be between 0.1% and 1.25%')
  }
}

function round(value: number, places: number): number {
  const scale = 10 ** places
  return Math.round(value * scale) / scale
}
