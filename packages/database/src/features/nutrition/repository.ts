import { Context, Effect, Layer, Schema } from 'effect'
import { SqlClient } from 'effect/unstable/sql'

import { type RepositoryError, decodeRequiredRow, decodeRows } from '../../core/repository.ts'
import { validateSchemaName } from '../../migrations.ts'
import type { DailyActivity, ExerciseFrequency, MetabolicSex, WeightGoal } from '../../types.ts'

const nutritionPlanRecordSchema = Schema.Struct({
  birth_date: Schema.Date,
  calculated_at: Schema.Date,
  calorie_target_kcal: Schema.Number,
  current_weight_kg: Schema.Number,
  daily_activity: Schema.Literals(['mostly_sedentary', 'moderately_active', 'very_active']),
  estimated_expenditure_kcal: Schema.Number,
  estimated_weeks: Schema.NullOr(Schema.Number),
  exercise_frequency: Schema.Literals(['none', 'one_to_three', 'four_to_six', 'seven_plus']),
  height_cm: Schema.Number,
  metabolic_sex: Schema.Literals(['female', 'male']),
  profile_id: Schema.String,
  rate_limited: Schema.Boolean,
  resting_energy_kcal: Schema.Number,
  target_weight_kg: Schema.Number,
  updated_at: Schema.Date,
  weekly_weight_change_percent: Schema.Number,
  weight_goal: Schema.Literals(['lose', 'maintain', 'gain']),
})

export type NutritionPlanRecord = typeof nutritionPlanRecordSchema.Type

export interface SaveNutritionPlanRecordInput {
  readonly birthDate: string
  readonly calculatedAt: Date
  readonly calorieTargetKcal: number
  readonly currentWeightKg: number
  readonly dailyActivity: DailyActivity
  readonly estimatedExpenditureKcal: number
  readonly estimatedWeeks: number | null
  readonly exerciseFrequency: ExerciseFrequency
  readonly heightCm: number
  readonly metabolicSex: MetabolicSex
  readonly rateLimited: boolean
  readonly restingEnergyKcal: number
  readonly targetWeightKg: number
  readonly weeklyWeightChangePercent: number
  readonly weightGoal: WeightGoal
}

export interface NutritionPlanRepositoryService {
  readonly findByProfileId: (
    profileId: string,
  ) => Effect.Effect<NutritionPlanRecord | undefined, RepositoryError>
  readonly save: (
    profileId: string,
    input: SaveNutritionPlanRecordInput,
  ) => Effect.Effect<NutritionPlanRecord, RepositoryError>
}

export const NutritionPlanRepository = Context.Service<NutritionPlanRepositoryService>(
  '@regolith/database/NutritionPlanRepository',
)

export const makeNutritionPlanRepository = (options: { readonly appSchema?: string } = {}) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const appSchema = yield* validateSchemaName(options.appSchema ?? 'regolith_app')
    const profiles = sql(`${appSchema}.profiles`)
    const nutritionPlans = sql(`${appSchema}.nutrition_plans`)

    const findByProfileId = Effect.fn('NutritionPlanRepository.findByProfileId')(function* (
      profileId: string,
    ) {
      const rows = yield* sql`SELECT * FROM ${nutritionPlans} WHERE profile_id = ${profileId}`
      return (yield* decodeRows(nutritionPlanRecordSchema, rows))[0]
    })

    const save = Effect.fn('NutritionPlanRepository.save')(function* (
      profileId: string,
      input: SaveNutritionPlanRecordInput,
    ) {
      return yield* sql.withTransaction(
        Effect.gen(function* () {
          yield* sql`INSERT INTO ${profiles} (profile_id, clerk_user_id)
            VALUES (${profileId}, NULL)
            ON CONFLICT (profile_id) DO UPDATE SET updated_at = ${input.calculatedAt}`
          const rows = yield* sql`INSERT INTO ${nutritionPlans} (
              profile_id, metabolic_sex, birth_date, height_cm, current_weight_kg,
              exercise_frequency, daily_activity, weight_goal, target_weight_kg,
              weekly_weight_change_percent, resting_energy_kcal, estimated_expenditure_kcal,
              calorie_target_kcal, estimated_weeks, rate_limited, calculated_at
            ) VALUES (
              ${profileId}, ${input.metabolicSex}, ${input.birthDate}, ${input.heightCm}, ${input.currentWeightKg},
              ${input.exerciseFrequency}, ${input.dailyActivity}, ${input.weightGoal}, ${input.targetWeightKg},
              ${input.weeklyWeightChangePercent}, ${input.restingEnergyKcal}, ${input.estimatedExpenditureKcal},
              ${input.calorieTargetKcal}, ${input.estimatedWeeks}, ${input.rateLimited}, ${input.calculatedAt}
            ) ON CONFLICT (profile_id) DO UPDATE SET
              metabolic_sex = EXCLUDED.metabolic_sex,
              birth_date = EXCLUDED.birth_date,
              height_cm = EXCLUDED.height_cm,
              current_weight_kg = EXCLUDED.current_weight_kg,
              exercise_frequency = EXCLUDED.exercise_frequency,
              daily_activity = EXCLUDED.daily_activity,
              weight_goal = EXCLUDED.weight_goal,
              target_weight_kg = EXCLUDED.target_weight_kg,
              weekly_weight_change_percent = EXCLUDED.weekly_weight_change_percent,
              resting_energy_kcal = EXCLUDED.resting_energy_kcal,
              estimated_expenditure_kcal = EXCLUDED.estimated_expenditure_kcal,
              calorie_target_kcal = EXCLUDED.calorie_target_kcal,
              estimated_weeks = EXCLUDED.estimated_weeks,
              rate_limited = EXCLUDED.rate_limited,
              calculated_at = EXCLUDED.calculated_at,
              updated_at = EXCLUDED.calculated_at
            RETURNING *`
          return yield* decodeRequiredRow(
            nutritionPlanRecordSchema,
            rows,
            'Nutrition plan upsert returned no row',
          )
        }),
      )
    })

    return NutritionPlanRepository.of({ findByProfileId, save })
  })

export const nutritionPlanRepositoryLayer = (options: { readonly appSchema?: string } = {}) =>
  Layer.effect(NutritionPlanRepository, makeNutritionPlanRepository(options))
