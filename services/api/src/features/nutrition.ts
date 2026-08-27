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
} from '../core/errors.ts'
import { fromProfileService } from '../core/handler-errors.ts'
import {
  type ProfileAccessDenied,
  type ServicePersistenceError,
  fromRepository,
} from '../core/service-errors.ts'
import { ProfileAccessService } from './profile.ts'
import {
  type DailyActivity,
  type ExerciseFrequency,
  type MetabolicSex,
  type NutritionPlan,
  type SaveNutritionPlan,
  type WeightGoal,
  nutritionPlanResponseSchema,
  nutritionPlanSchema,
  profilePathSchema,
  saveNutritionPlanSchema,
} from '@regolith/contracts'
import { type NutritionPlanRecord, NutritionPlanRepository } from '@regolith/database'
import { Context, Effect, Layer } from 'effect'
import { HttpApiBuilder, HttpApiEndpoint, HttpApiGroup } from 'effect/unstable/httpapi'

const profileErrors = [
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  NotFoundError,
  ServiceUnavailableError,
  InternalApiError,
]

export const nutritionApi = HttpApiGroup.make('nutrition')
  .add(
    HttpApiEndpoint.get('getNutritionPlan', '/v1/profiles/:profileId/nutrition-plan', {
      params: profilePathSchema,
      success: nutritionPlanResponseSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.put('saveNutritionPlan', '/v1/profiles/:profileId/nutrition-plan', {
      params: profilePathSchema,
      payload: saveNutritionPlanSchema,
      success: nutritionPlanSchema,
      error: profileErrors,
    }),
  )
  .middleware(RequestValidation)
  .middleware(Authentication)

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

export const nutritionHandlers = (api: typeof RegolithApi) =>
  HttpApiBuilder.group(api, 'nutrition', (handlers) =>
    handlers
      .handle('getNutritionPlan', ({ params }) =>
        Effect.gen(function* () {
          const nutrition = yield* NutritionService
          const identity = yield* CurrentIdentity
          return yield* fromProfileService(nutrition.get(params.profileId, identity.userId))
        }),
      )
      .handle('saveNutritionPlan', ({ params, payload }) =>
        Effect.gen(function* () {
          const nutrition = yield* NutritionService
          const identity = yield* CurrentIdentity
          return yield* fromProfileService(
            nutrition.save(params.profileId, identity.userId, payload),
          )
        }),
      ),
  )

export const toNutritionPlan = (plan: NutritionPlanRecord): NutritionPlan => ({
  birthDate: plan.birth_date.toISOString().slice(0, 10),
  calculatedAt: plan.calculated_at.toISOString(),
  calorieTargetKcal: plan.calorie_target_kcal,
  currentWeightKg: plan.current_weight_kg,
  dailyActivity: plan.daily_activity,
  estimatedExpenditureKcal: plan.estimated_expenditure_kcal,
  estimatedWeeks: plan.estimated_weeks,
  exerciseFrequency: plan.exercise_frequency,
  heightCm: plan.height_cm,
  metabolicSex: plan.metabolic_sex,
  rateLimited: plan.rate_limited,
  restingEnergyKcal: plan.resting_energy_kcal,
  targetWeightKg: plan.target_weight_kg,
  weeklyWeightChangePercent: plan.weekly_weight_change_percent,
  weightGoal: plan.weight_goal,
})

type NutritionServiceError = ProfileAccessDenied | ServicePersistenceError

export interface NutritionServiceShape {
  readonly get: (
    profileId: string,
    clerkUserId: string,
  ) => Effect.Effect<{ readonly plan: NutritionPlan | null }, NutritionServiceError>
  readonly save: (
    profileId: string,
    clerkUserId: string,
    input: SaveNutritionPlan,
  ) => Effect.Effect<NutritionPlan, NutritionServiceError>
}

export const NutritionService = Context.Service<NutritionServiceShape>(
  '@regolith/api/NutritionService',
)

export const nutritionServiceLayer = Layer.effect(
  NutritionService,
  Effect.gen(function* () {
    const access = yield* ProfileAccessService
    const plans = yield* NutritionPlanRepository
    return NutritionService.of({
      get: Effect.fn('NutritionService.get')(function* (profileId: string, clerkUserId: string) {
        yield* access.authorize(profileId, clerkUserId)
        const plan = yield* fromRepository(
          'NutritionPlanRepository.findByProfileId',
          plans.findByProfileId(profileId),
        )
        return { plan: plan === undefined ? null : toNutritionPlan(plan) }
      }),
      save: Effect.fn('NutritionService.save')(function* (
        profileId: string,
        clerkUserId: string,
        input: SaveNutritionPlan,
      ) {
        yield* access.authorize(profileId, clerkUserId)
        const calculation = yield* Effect.sync(() => calculateNutritionPlan(input))
        const plan = yield* fromRepository(
          'NutritionPlanRepository.save',
          plans.save(profileId, calculation),
        )
        return toNutritionPlan(plan)
      }),
    })
  }),
)
