import { sql, type Kysely, type Selectable } from 'kysely'

import { calculateNutritionPlan, type NutritionPlanInput } from './nutrition-plan.js'
import type {
  CatalogDatabase,
  DatasetKind,
  FoodLogEntryTable,
  MealCategory,
  NutritionPlanTable,
  WeightLogEntryTable,
  WorkoutKind,
  WorkoutSessionTable,
  WorkoutSetTable,
} from './types.js'

export type FoodLogEntryRecord = Selectable<FoodLogEntryTable>
export type NutritionPlanRecord = Selectable<NutritionPlanTable>
export type WeightLogEntryRecord = Selectable<WeightLogEntryTable>
export type WorkoutSessionRow = Selectable<WorkoutSessionTable>
export type WorkoutSetRow = Selectable<WorkoutSetTable>

export interface CreateFoodLogEntryInput {
  datasetKind: DatasetKind
  entryId: string
  foodId: string
  loggedAt: Date
  mealCategory: MealCategory
  quantityGrams: number
}

export interface SaveWeightLogEntryInput {
  entryId: string
  measuredAt: Date
  weightKg: number
}

export interface WorkoutSetInput {
  detail: string
  setId: string
  title: string
  value: string
}

export interface SaveWorkoutInput {
  completedAt: Date | null
  distanceKilometers: number | null
  durationMinutes: number
  kind: WorkoutKind
  sessionId: string
  sets: WorkoutSetInput[]
  startedAt: Date
  title: string
}

export interface WorkoutRecord {
  session: WorkoutSessionRow
  sets: WorkoutSetRow[]
}

export interface ApplicationRepository {
  deleteFoodLogEntry(profileId: string, entryId: string): Promise<boolean>
  deleteWorkout(profileId: string, sessionId: string): Promise<boolean>
  deleteWeightLogEntry(profileId: string, entryId: string): Promise<boolean>
  ensureProfile(profileId: string): Promise<void>
  getNutritionPlan(profileId: string): Promise<NutritionPlanRecord | undefined>
  listFoodLog(profileId: string, from: Date, to: Date): Promise<FoodLogEntryRecord[]>
  listWorkouts(profileId: string, from: Date, to: Date): Promise<WorkoutRecord[]>
  listWeightLog(profileId: string, from: Date, to: Date): Promise<WeightLogEntryRecord[]>
  saveFoodLogEntry(
    profileId: string,
    input: CreateFoodLogEntryInput,
  ): Promise<FoodLogEntryRecord | undefined>
  saveNutritionPlan(profileId: string, input: NutritionPlanInput): Promise<NutritionPlanRecord>
  saveWorkout(profileId: string, input: SaveWorkoutInput): Promise<WorkoutRecord>
  saveWeightLogEntry(
    profileId: string,
    input: SaveWeightLogEntryInput,
  ): Promise<WeightLogEntryRecord>
}

export class KyselyApplicationRepository implements ApplicationRepository {
  private readonly appSchema: string
  private readonly catalogSchema: string
  private readonly database: Kysely<CatalogDatabase>
  private readonly now: () => Date

  constructor(
    database: Kysely<CatalogDatabase>,
    options: { appSchema?: string; catalogSchema?: string; now?: () => Date } = {},
  ) {
    this.database = database
    this.appSchema = options.appSchema ?? 'regolith_app'
    this.catalogSchema = options.catalogSchema ?? 'regolith'
    this.now = options.now ?? (() => new Date())
  }

  async ensureProfile(profileId: string): Promise<void> {
    await this.ensureProfileWith(this.database, profileId)
  }

  async getNutritionPlan(profileId: string): Promise<NutritionPlanRecord | undefined> {
    return this.database
      .withSchema(this.appSchema)
      .selectFrom('nutrition_plans')
      .selectAll()
      .where('profile_id', '=', profileId)
      .executeTakeFirst()
  }

  async saveNutritionPlan(
    profileId: string,
    input: NutritionPlanInput,
  ): Promise<NutritionPlanRecord> {
    const plan = calculateNutritionPlan(input, this.now())
    return this.database.transaction().execute(async (transaction) => {
      await this.ensureProfileWith(transaction, profileId)
      return transaction
        .withSchema(this.appSchema)
        .insertInto('nutrition_plans')
        .values({
          birth_date: plan.birthDate,
          calculated_at: plan.calculatedAt,
          calorie_target_kcal: plan.calorieTargetKcal,
          current_weight_kg: plan.currentWeightKg,
          daily_activity: plan.dailyActivity,
          estimated_expenditure_kcal: plan.estimatedExpenditureKcal,
          estimated_weeks: plan.estimatedWeeks,
          exercise_frequency: plan.exerciseFrequency,
          height_cm: plan.heightCm,
          metabolic_sex: plan.metabolicSex,
          profile_id: profileId,
          rate_limited: plan.rateLimited,
          resting_energy_kcal: plan.restingEnergyKcal,
          target_weight_kg: plan.targetWeightKg,
          weekly_weight_change_percent: plan.weeklyWeightChangePercent,
          weight_goal: plan.weightGoal,
        })
        .onConflict((conflict) =>
          conflict.column('profile_id').doUpdateSet({
            birth_date: plan.birthDate,
            calculated_at: plan.calculatedAt,
            calorie_target_kcal: plan.calorieTargetKcal,
            current_weight_kg: plan.currentWeightKg,
            daily_activity: plan.dailyActivity,
            estimated_expenditure_kcal: plan.estimatedExpenditureKcal,
            estimated_weeks: plan.estimatedWeeks,
            exercise_frequency: plan.exerciseFrequency,
            height_cm: plan.heightCm,
            metabolic_sex: plan.metabolicSex,
            rate_limited: plan.rateLimited,
            resting_energy_kcal: plan.restingEnergyKcal,
            target_weight_kg: plan.targetWeightKg,
            updated_at: plan.calculatedAt,
            weekly_weight_change_percent: plan.weeklyWeightChangePercent,
            weight_goal: plan.weightGoal,
          }),
        )
        .returningAll()
        .executeTakeFirstOrThrow()
    })
  }

  async saveFoodLogEntry(
    profileId: string,
    input: CreateFoodLogEntryInput,
  ): Promise<FoodLogEntryRecord | undefined> {
    return this.database.transaction().execute(async (transaction) => {
      await this.ensureProfileWith(transaction, profileId)
      const food = await transaction
        .withSchema(this.catalogSchema)
        .selectFrom('foods')
        .select([
          'brand',
          'calories',
          sql<number | null>`coalesce(carbohydrates_total, carbohydrates_available)`.as(
            'carbohydrates_total',
          ),
          'dataset_kind',
          'food_id',
          'gtin',
          'name',
          'protein',
          'total_fat',
        ])
        .where('dataset_kind', '=', input.datasetKind)
        .where('food_id', '=', input.foodId)
        .executeTakeFirst()

      if (food === undefined) {
        return undefined
      }

      return transaction
        .withSchema(this.appSchema)
        .insertInto('food_log_entries')
        .values({
          brand: food.brand,
          calories_per_100g: food.calories,
          carbohydrates_per_100g: food.carbohydrates_total,
          dataset_kind: food.dataset_kind,
          entry_id: input.entryId,
          fat_per_100g: food.total_fat,
          food_id: food.food_id,
          gtin: food.gtin,
          logged_at: input.loggedAt,
          meal_category: input.mealCategory,
          name: food.name,
          profile_id: profileId,
          protein_per_100g: food.protein,
          quantity_grams: input.quantityGrams,
        })
        .onConflict((conflict) =>
          conflict.column('entry_id').doUpdateSet({
            logged_at: input.loggedAt,
            meal_category: input.mealCategory,
            quantity_grams: input.quantityGrams,
          }),
        )
        .returningAll()
        .executeTakeFirstOrThrow()
    })
  }

  async listFoodLog(profileId: string, from: Date, to: Date): Promise<FoodLogEntryRecord[]> {
    return this.database
      .withSchema(this.appSchema)
      .selectFrom('food_log_entries')
      .selectAll()
      .where('profile_id', '=', profileId)
      .where('logged_at', '>=', from)
      .where('logged_at', '<', to)
      .orderBy('logged_at', 'asc')
      .orderBy('entry_id', 'asc')
      .execute()
  }

  async deleteFoodLogEntry(profileId: string, entryId: string): Promise<boolean> {
    const result = await this.database
      .withSchema(this.appSchema)
      .deleteFrom('food_log_entries')
      .where('profile_id', '=', profileId)
      .where('entry_id', '=', entryId)
      .executeTakeFirst()
    return result.numDeletedRows > 0n
  }

  async listWeightLog(profileId: string, from: Date, to: Date): Promise<WeightLogEntryRecord[]> {
    return this.database
      .withSchema(this.appSchema)
      .selectFrom('weight_log_entries')
      .selectAll()
      .where('profile_id', '=', profileId)
      .where('measured_at', '>=', from)
      .where('measured_at', '<', to)
      .orderBy('measured_at', 'asc')
      .orderBy('entry_id', 'asc')
      .execute()
  }

  async saveWeightLogEntry(
    profileId: string,
    input: SaveWeightLogEntryInput,
  ): Promise<WeightLogEntryRecord> {
    return this.database.transaction().execute(async (transaction) => {
      await this.ensureProfileWith(transaction, profileId)
      return transaction
        .withSchema(this.appSchema)
        .insertInto('weight_log_entries')
        .values({
          entry_id: input.entryId,
          measured_at: input.measuredAt,
          profile_id: profileId,
          weight_kg: input.weightKg,
        })
        .onConflict((conflict) =>
          conflict.column('entry_id').doUpdateSet({
            measured_at: input.measuredAt,
            updated_at: this.now(),
            weight_kg: input.weightKg,
          }),
        )
        .returningAll()
        .executeTakeFirstOrThrow()
    })
  }

  async deleteWeightLogEntry(profileId: string, entryId: string): Promise<boolean> {
    const result = await this.database
      .withSchema(this.appSchema)
      .deleteFrom('weight_log_entries')
      .where('profile_id', '=', profileId)
      .where('entry_id', '=', entryId)
      .executeTakeFirst()
    return result.numDeletedRows > 0n
  }

  async saveWorkout(profileId: string, input: SaveWorkoutInput): Promise<WorkoutRecord> {
    return this.database.transaction().execute(async (transaction) => {
      await this.ensureProfileWith(transaction, profileId)
      const session = await transaction
        .withSchema(this.appSchema)
        .insertInto('workout_sessions')
        .values({
          completed_at: input.completedAt,
          distance_kilometers: input.distanceKilometers,
          duration_minutes: input.durationMinutes,
          kind: input.kind,
          profile_id: profileId,
          session_id: input.sessionId,
          started_at: input.startedAt,
          title: input.title,
        })
        .onConflict((conflict) =>
          conflict.column('session_id').doUpdateSet({
            completed_at: input.completedAt,
            distance_kilometers: input.distanceKilometers,
            duration_minutes: input.durationMinutes,
            kind: input.kind,
            started_at: input.startedAt,
            title: input.title,
            updated_at: this.now(),
          }),
        )
        .returningAll()
        .executeTakeFirstOrThrow()

      const appDatabase = transaction.withSchema(this.appSchema)
      await appDatabase
        .deleteFrom('workout_sets')
        .where('session_id', '=', input.sessionId)
        .execute()
      const sets = input.sets.map((set, ordinal) => ({
        detail: set.detail,
        ordinal,
        session_id: input.sessionId,
        set_id: set.setId,
        title: set.title,
        value: set.value,
      }))
      if (sets.length > 0) {
        await appDatabase.insertInto('workout_sets').values(sets).execute()
      }
      return { session, sets }
    })
  }

  async listWorkouts(profileId: string, from: Date, to: Date): Promise<WorkoutRecord[]> {
    const appDatabase = this.database.withSchema(this.appSchema)
    const sessions = await appDatabase
      .selectFrom('workout_sessions')
      .selectAll()
      .where('profile_id', '=', profileId)
      .where('started_at', '>=', from)
      .where('started_at', '<', to)
      .orderBy('started_at', 'desc')
      .orderBy('session_id', 'asc')
      .execute()
    if (sessions.length === 0) {
      return []
    }

    const sets = await appDatabase
      .selectFrom('workout_sets')
      .selectAll()
      .where(
        'session_id',
        'in',
        sessions.map((session) => session.session_id),
      )
      .orderBy('session_id', 'asc')
      .orderBy('ordinal', 'asc')
      .execute()
    const setsBySession = Map.groupBy(sets, (set) => set.session_id)
    return sessions.map((session) => ({
      session,
      sets: setsBySession.get(session.session_id) ?? [],
    }))
  }

  async deleteWorkout(profileId: string, sessionId: string): Promise<boolean> {
    const result = await this.database
      .withSchema(this.appSchema)
      .deleteFrom('workout_sessions')
      .where('profile_id', '=', profileId)
      .where('session_id', '=', sessionId)
      .executeTakeFirst()
    return result.numDeletedRows > 0n
  }

  private async ensureProfileWith(
    database: Kysely<CatalogDatabase>,
    profileId: string,
  ): Promise<void> {
    await database
      .withSchema(this.appSchema)
      .insertInto('profiles')
      .values({ profile_id: profileId })
      .onConflict((conflict) =>
        conflict.column('profile_id').doUpdateSet({ updated_at: this.now() }),
      )
      .execute()
  }
}
