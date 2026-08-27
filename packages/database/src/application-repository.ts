import { Context, Data, Effect, Layer, Schema } from 'effect'
import { SqlClient, SqlError } from 'effect/unstable/sql'

import { validateSchemaName } from './migrations.ts'
import { calculateNutritionPlan, type NutritionPlanInput } from './nutrition-plan.ts'
import type { FoodSourceKind, MealCategory, WorkoutKind } from './types.ts'

const datasetKindSchema = Schema.Literals(['raw', 'branded', 'custom', 'recipe'])
const mealCategorySchema = Schema.Literals(['breakfast', 'lunch', 'dinner', 'snack'])
const workoutKindSchema = Schema.Literals(['strength', 'cardio'])
const dailyActivitySchema = Schema.Literals([
  'mostly_sedentary',
  'moderately_active',
  'very_active',
])
const exerciseFrequencySchema = Schema.Literals([
  'none',
  'one_to_three',
  'four_to_six',
  'seven_plus',
])
const metabolicSexSchema = Schema.Literals(['female', 'male'])
const weightGoalSchema = Schema.Literals(['lose', 'maintain', 'gain'])

const foodLogEntryRecordSchema = Schema.Struct({
  brand: Schema.NullOr(Schema.String),
  calories_per_100g: Schema.NullOr(Schema.Number),
  carbohydrates_per_100g: Schema.NullOr(Schema.Number),
  created_at: Schema.Date,
  dataset_kind: datasetKindSchema,
  entry_id: Schema.String,
  fat_per_100g: Schema.NullOr(Schema.Number),
  food_id: Schema.String,
  gtin: Schema.NullOr(Schema.String),
  logged_at: Schema.Date,
  meal_category: mealCategorySchema,
  meal_id: Schema.String,
  name: Schema.String,
  profile_id: Schema.String,
  protein_per_100g: Schema.NullOr(Schema.Number),
  quantity_grams: Schema.Number,
})

const nutritionPlanRecordSchema = Schema.Struct({
  birth_date: Schema.Date,
  calculated_at: Schema.Date,
  calorie_target_kcal: Schema.Number,
  current_weight_kg: Schema.Number,
  daily_activity: dailyActivitySchema,
  estimated_expenditure_kcal: Schema.Number,
  estimated_weeks: Schema.NullOr(Schema.Number),
  exercise_frequency: exerciseFrequencySchema,
  height_cm: Schema.Number,
  metabolic_sex: metabolicSexSchema,
  profile_id: Schema.String,
  rate_limited: Schema.Boolean,
  resting_energy_kcal: Schema.Number,
  target_weight_kg: Schema.Number,
  updated_at: Schema.Date,
  weekly_weight_change_percent: Schema.Number,
  weight_goal: weightGoalSchema,
})

const weightLogEntryRecordSchema = Schema.Struct({
  created_at: Schema.Date,
  entry_id: Schema.String,
  measured_at: Schema.Date,
  profile_id: Schema.String,
  updated_at: Schema.Date,
  weight_kg: Schema.Number,
})

const workoutSessionRowSchema = Schema.Struct({
  completed_at: Schema.NullOr(Schema.Date),
  created_at: Schema.Date,
  distance_kilometers: Schema.NullOr(Schema.Number),
  duration_minutes: Schema.Number,
  kind: workoutKindSchema,
  profile_id: Schema.String,
  session_id: Schema.String,
  started_at: Schema.Date,
  title: Schema.String,
  updated_at: Schema.Date,
})

const workoutSetRowSchema = Schema.Struct({
  detail: Schema.String,
  ordinal: Schema.Number,
  session_id: Schema.String,
  set_id: Schema.String,
  title: Schema.String,
  value: Schema.String,
})

const workoutTemplateRowSchema = Schema.Struct({
  created_at: Schema.Date,
  name: Schema.String,
  profile_id: Schema.String,
  template_id: Schema.String,
  updated_at: Schema.Date,
})

const workoutTemplateExerciseRowSchema = Schema.Struct({
  category: Schema.String,
  equipment: Schema.String,
  exercise_id: Schema.String,
  name: Schema.String,
  notes: Schema.String,
  ordinal: Schema.Number,
  template_exercise_id: Schema.String,
  template_id: Schema.String,
})

const workoutTemplateSetRowSchema = Schema.Struct({
  ordinal: Schema.Number,
  repetitions: Schema.Number,
  rest_seconds: Schema.Number,
  template_exercise_id: Schema.String,
  template_set_id: Schema.String,
  weight_pounds: Schema.Number,
})

const catalogFoodRowSchema = Schema.Struct({
  brand: Schema.NullOr(Schema.String),
  calories: Schema.NullOr(Schema.Number),
  carbohydrates_total: Schema.NullOr(Schema.Number),
  dataset_kind: datasetKindSchema,
  food_id: Schema.String,
  gtin: Schema.NullOr(Schema.String),
  name: Schema.String,
  protein: Schema.NullOr(Schema.Number),
  total_fat: Schema.NullOr(Schema.Number),
})

export type FoodLogEntryRecord = typeof foodLogEntryRecordSchema.Type
export type NutritionPlanRecord = typeof nutritionPlanRecordSchema.Type
export type WeightLogEntryRecord = typeof weightLogEntryRecordSchema.Type
export type WorkoutSessionRow = typeof workoutSessionRowSchema.Type
export type WorkoutSetRow = typeof workoutSetRowSchema.Type
export type WorkoutTemplateRow = typeof workoutTemplateRowSchema.Type
export type WorkoutTemplateExerciseRow = typeof workoutTemplateExerciseRowSchema.Type
export type WorkoutTemplateSetRow = typeof workoutTemplateSetRowSchema.Type

export interface CreateFoodLogEntryInput {
  readonly datasetKind: FoodSourceKind
  readonly entryId: string
  readonly foodId: string
  readonly loggedAt: Date
  readonly mealCategory: MealCategory
  readonly quantityGrams: number
}

export interface SaveWeightLogEntryInput {
  readonly entryId: string
  readonly measuredAt: Date
  readonly weightKg: number
}

export interface WorkoutSetInput {
  readonly detail: string
  readonly setId: string
  readonly title: string
  readonly value: string
}

export interface SaveWorkoutInput {
  readonly completedAt: Date | null
  readonly distanceKilometers: number | null
  readonly durationMinutes: number
  readonly kind: WorkoutKind
  readonly sessionId: string
  readonly sets: ReadonlyArray<WorkoutSetInput>
  readonly startedAt: Date
  readonly title: string
}

export interface WorkoutRecord {
  readonly session: WorkoutSessionRow
  readonly sets: ReadonlyArray<WorkoutSetRow>
}

export interface WorkoutTemplateSetInput {
  readonly repetitions: number
  readonly restSeconds: number
  readonly setId: string
  readonly weightPounds: number
}

export interface WorkoutTemplateExerciseInput {
  readonly category: string
  readonly equipment: string
  readonly exerciseId: string
  readonly name: string
  readonly notes: string
  readonly sets: ReadonlyArray<WorkoutTemplateSetInput>
  readonly templateExerciseId: string
}

export interface SaveWorkoutTemplateInput {
  readonly exercises: ReadonlyArray<WorkoutTemplateExerciseInput>
  readonly name: string
  readonly templateId: string
}

export interface WorkoutTemplateExerciseRecord {
  readonly exercise: WorkoutTemplateExerciseRow
  readonly sets: ReadonlyArray<WorkoutTemplateSetRow>
}

export interface WorkoutTemplateRecord {
  readonly exercises: ReadonlyArray<WorkoutTemplateExerciseRecord>
  readonly template: WorkoutTemplateRow
}

export class RepositoryInvariantError extends Data.TaggedError('RepositoryInvariantError')<{
  readonly message: string
}> {}

export class RepositoryOwnershipError extends Data.TaggedError('RepositoryOwnershipError')<{
  readonly message: string
}> {}

export type ApplicationRepositoryError =
  | SqlError.SqlError
  | Schema.SchemaError
  | RepositoryInvariantError
  | RepositoryOwnershipError

export interface ApplicationRepositoryService {
  readonly deleteFoodLogEntry: (
    profileId: string,
    entryId: string,
  ) => Effect.Effect<boolean, SqlError.SqlError>
  readonly deleteWorkout: (
    profileId: string,
    sessionId: string,
  ) => Effect.Effect<boolean, SqlError.SqlError>
  readonly deleteWorkoutTemplate: (
    profileId: string,
    templateId: string,
  ) => Effect.Effect<boolean, SqlError.SqlError>
  readonly deleteWeightLogEntry: (
    profileId: string,
    entryId: string,
  ) => Effect.Effect<boolean, SqlError.SqlError>
  readonly ensureProfile: (profileId: string) => Effect.Effect<void, SqlError.SqlError>
  readonly ensureProfileForClerkUser: (
    clerkUserId: string,
  ) => Effect.Effect<string, ApplicationRepositoryError>
  readonly getNutritionPlan: (
    profileId: string,
  ) => Effect.Effect<NutritionPlanRecord | undefined, ApplicationRepositoryError>
  readonly listFoodLog: (
    profileId: string,
    from: Date,
    to: Date,
  ) => Effect.Effect<ReadonlyArray<FoodLogEntryRecord>, ApplicationRepositoryError>
  readonly listWorkouts: (
    profileId: string,
    from: Date,
    to: Date,
  ) => Effect.Effect<ReadonlyArray<WorkoutRecord>, ApplicationRepositoryError>
  readonly listWorkoutTemplates: (
    profileId: string,
  ) => Effect.Effect<ReadonlyArray<WorkoutTemplateRecord>, ApplicationRepositoryError>
  readonly listWeightLog: (
    profileId: string,
    from: Date,
    to: Date,
  ) => Effect.Effect<ReadonlyArray<WeightLogEntryRecord>, ApplicationRepositoryError>
  readonly profileBelongsToClerkUser: (
    profileId: string,
    clerkUserId: string,
  ) => Effect.Effect<boolean, SqlError.SqlError>
  readonly saveFoodLogEntry: (
    profileId: string,
    input: CreateFoodLogEntryInput,
  ) => Effect.Effect<FoodLogEntryRecord | undefined, ApplicationRepositoryError>
  readonly saveNutritionPlan: (
    profileId: string,
    input: NutritionPlanInput,
  ) => Effect.Effect<NutritionPlanRecord, ApplicationRepositoryError>
  readonly saveWorkout: (
    profileId: string,
    input: SaveWorkoutInput,
  ) => Effect.Effect<WorkoutRecord, ApplicationRepositoryError>
  readonly saveWorkoutTemplate: (
    profileId: string,
    input: SaveWorkoutTemplateInput,
  ) => Effect.Effect<WorkoutTemplateRecord, ApplicationRepositoryError>
  readonly saveWeightLogEntry: (
    profileId: string,
    input: SaveWeightLogEntryInput,
  ) => Effect.Effect<WeightLogEntryRecord, ApplicationRepositoryError>
}

export const ApplicationRepository = Context.Service<ApplicationRepositoryService>(
  '@mons/database/ApplicationRepository',
)

const decodeArray = <S extends Schema.Constraint>(schema: S, rows: ReadonlyArray<unknown>) =>
  Schema.decodeUnknownEffect(Schema.Array(schema))(rows)

const decodeRequired = <S extends Schema.Constraint>(
  schema: S,
  rows: ReadonlyArray<unknown>,
  message: string,
) =>
  Effect.gen(function* () {
    const decoded = yield* decodeArray(schema, rows)
    const value = decoded[0]
    if (value === undefined) return yield* new RepositoryInvariantError({ message })
    return value
  })

export const makeApplicationRepository = (
  options: {
    readonly appSchema?: string
    readonly catalogSchema?: string
    readonly now?: () => Date
  } = {},
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const appSchema = yield* validateSchemaName(options.appSchema ?? 'mons_app')
    const catalogSchema = yield* validateSchemaName(options.catalogSchema ?? 'mons_catalog')
    const now = options.now ?? (() => new Date())
    const profiles = sql(`${appSchema}.profiles`)
    const nutritionPlans = sql(`${appSchema}.nutrition_plans`)
    const foodLogEntries = sql(`${appSchema}.food_log_entries`)
    const mealLogs = sql(`${appSchema}.meal_logs`)
    const weightLogEntries = sql(`${appSchema}.weight_log_entries`)
    const workoutSessions = sql(`${appSchema}.workout_sessions`)
    const workoutSets = sql(`${appSchema}.workout_sets`)
    const workoutTemplates = sql(`${appSchema}.workout_templates`)
    const workoutTemplateExercises = sql(`${appSchema}.workout_template_exercises`)
    const workoutTemplateSets = sql(`${appSchema}.workout_template_sets`)
    const customFoods = sql(`${appSchema}.custom_foods`)
    const recipes = sql(`${appSchema}.recipes`)
    const foods = sql(`${catalogSchema}.foods`)

    const ensureProfile = Effect.fn('ApplicationRepository.ensureProfile')(function* (
      profileId: string,
    ) {
      yield* sql`INSERT INTO ${profiles} (profile_id, clerk_user_id)
        VALUES (${profileId}, NULL)
        ON CONFLICT (profile_id) DO UPDATE SET updated_at = ${now()}`
    })

    const ensureProfileForClerkUser = Effect.fn('ApplicationRepository.ensureProfileForClerkUser')(
      function* (clerkUserId: string) {
        const rows = yield* sql`INSERT INTO ${profiles} (clerk_user_id)
          VALUES (${clerkUserId})
          ON CONFLICT (clerk_user_id) DO UPDATE SET updated_at = ${now()}
          RETURNING profile_id`
        const profile = yield* decodeRequired(
          Schema.Struct({ profile_id: Schema.String }),
          rows,
          'Profile upsert returned no row',
        )
        return profile.profile_id
      },
    )

    const profileBelongsToClerkUser = Effect.fn('ApplicationRepository.profileBelongsToClerkUser')(
      function* (profileId: string, clerkUserId: string) {
        const rows = yield* sql`SELECT profile_id FROM ${profiles}
          WHERE profile_id = ${profileId} AND clerk_user_id = ${clerkUserId} LIMIT 1`
        return rows.length > 0
      },
    )

    const listWorkoutTemplates = Effect.fn('ApplicationRepository.listWorkoutTemplates')(function* (
      profileId: string,
    ) {
      const templateRows = yield* sql`SELECT * FROM ${workoutTemplates}
          WHERE profile_id = ${profileId} ORDER BY updated_at DESC, template_id`
      const templates = yield* decodeArray(workoutTemplateRowSchema, templateRows)
      if (templates.length === 0) return []
      const exerciseRows = yield* sql`SELECT * FROM ${workoutTemplateExercises}
          WHERE ${sql.in(
            'template_id',
            templates.map((template) => template.template_id),
          )}
          ORDER BY template_id, ordinal`
      const exercises = yield* decodeArray(workoutTemplateExerciseRowSchema, exerciseRows)
      const setRows =
        exercises.length === 0
          ? []
          : yield* sql`SELECT * FROM ${workoutTemplateSets}
                WHERE ${sql.in(
                  'template_exercise_id',
                  exercises.map((exercise) => exercise.template_exercise_id),
                )}
                ORDER BY template_exercise_id, ordinal`
      const sets = yield* decodeArray(workoutTemplateSetRowSchema, setRows)
      return templates.map((template) => ({
        exercises: exercises
          .filter((exercise) => exercise.template_id === template.template_id)
          .map((exercise) => ({
            exercise,
            sets: sets.filter((set) => set.template_exercise_id === exercise.template_exercise_id),
          })),
        template,
      }))
    })

    const saveWorkoutTemplate = Effect.fn('ApplicationRepository.saveWorkoutTemplate')(function* (
      profileId: string,
      input: SaveWorkoutTemplateInput,
    ) {
      yield* sql.withTransaction(
        Effect.gen(function* () {
          yield* ensureProfile(profileId)
          const owners = yield* sql<{ readonly belongs_to_profile: boolean }>`
            SELECT profile_id = ${profileId} AS belongs_to_profile
            FROM ${workoutTemplates} WHERE template_id = ${input.templateId}
          `
          if (owners[0] !== undefined && !owners[0].belongs_to_profile) {
            return yield* new RepositoryOwnershipError({
              message: 'Workout template does not belong to this profile',
            })
          }
          yield* sql`INSERT INTO ${workoutTemplates} (template_id, profile_id, name)
              VALUES (${input.templateId}, ${profileId}, ${input.name})
              ON CONFLICT (template_id) DO UPDATE SET name = ${input.name}, updated_at = ${now()}`
          yield* sql`DELETE FROM ${workoutTemplateExercises} WHERE template_id = ${input.templateId}`
          if (input.exercises.length > 0) {
            yield* sql`INSERT INTO ${workoutTemplateExercises} ${sql.insert(
              input.exercises.map((exercise, ordinal) => ({
                category: exercise.category,
                equipment: exercise.equipment,
                exercise_id: exercise.exerciseId,
                name: exercise.name,
                notes: exercise.notes,
                ordinal,
                template_exercise_id: exercise.templateExerciseId,
                template_id: input.templateId,
              })),
            )}`
            const sets = input.exercises.flatMap((exercise) =>
              exercise.sets.map((set, ordinal) => ({
                ordinal,
                repetitions: set.repetitions,
                rest_seconds: set.restSeconds,
                template_exercise_id: exercise.templateExerciseId,
                template_set_id: set.setId,
                weight_pounds: set.weightPounds,
              })),
            )
            if (sets.length > 0) yield* sql`INSERT INTO ${workoutTemplateSets} ${sql.insert(sets)}`
          }
        }),
      )
      const templates = yield* listWorkoutTemplates(profileId)
      const saved = templates.find(
        (template) => template.template.template_id === input.templateId.toLowerCase(),
      )
      if (saved === undefined) {
        return yield* new RepositoryInvariantError({
          message: 'Saved workout template could not be loaded',
        })
      }
      return saved
    })

    const deleteWorkoutTemplate = Effect.fn('ApplicationRepository.deleteWorkoutTemplate')(
      function* (profileId: string, templateId: string) {
        const rows = yield* sql`DELETE FROM ${workoutTemplates}
          WHERE profile_id = ${profileId} AND template_id = ${templateId} RETURNING template_id`
        return rows.length > 0
      },
    )

    const getNutritionPlan = Effect.fn('ApplicationRepository.getNutritionPlan')(function* (
      profileId: string,
    ) {
      const rows = yield* sql`SELECT * FROM ${nutritionPlans} WHERE profile_id = ${profileId}`
      const decoded = yield* decodeArray(nutritionPlanRecordSchema, rows)
      return decoded[0]
    })

    const saveNutritionPlan = Effect.fn('ApplicationRepository.saveNutritionPlan')(function* (
      profileId: string,
      input: NutritionPlanInput,
    ) {
      const plan = calculateNutritionPlan(input, now())
      return yield* sql.withTransaction(
        Effect.gen(function* () {
          yield* ensureProfile(profileId)
          const rows = yield* sql`INSERT INTO ${nutritionPlans} (
              profile_id, metabolic_sex, birth_date, height_cm, current_weight_kg,
              exercise_frequency, daily_activity, weight_goal, target_weight_kg,
              weekly_weight_change_percent, resting_energy_kcal, estimated_expenditure_kcal,
              calorie_target_kcal, estimated_weeks, rate_limited, calculated_at
            ) VALUES (
              ${profileId}, ${plan.metabolicSex}, ${plan.birthDate}, ${plan.heightCm}, ${plan.currentWeightKg},
              ${plan.exerciseFrequency}, ${plan.dailyActivity}, ${plan.weightGoal}, ${plan.targetWeightKg},
              ${plan.weeklyWeightChangePercent}, ${plan.restingEnergyKcal}, ${plan.estimatedExpenditureKcal},
              ${plan.calorieTargetKcal}, ${plan.estimatedWeeks}, ${plan.rateLimited}, ${plan.calculatedAt}
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
          return yield* decodeRequired(
            nutritionPlanRecordSchema,
            rows,
            'Nutrition plan upsert returned no row',
          )
        }),
      )
    })

    const saveFoodLogEntry = Effect.fn('ApplicationRepository.saveFoodLogEntry')(function* (
      profileId: string,
      input: CreateFoodLogEntryInput,
    ) {
      return yield* sql.withTransaction(
        Effect.gen(function* () {
          yield* ensureProfile(profileId)
          const foodRows =
            input.datasetKind === 'custom'
              ? yield* sql`SELECT brand, calories_per_100g AS calories,
                    carbohydrates_per_100g AS carbohydrates_total, 'custom' AS dataset_kind,
                    food_id::text AS food_id, barcode AS gtin, name,
                    protein_per_100g AS protein, fat_per_100g AS total_fat
                  FROM ${customFoods}
                  WHERE profile_id = ${profileId} AND food_id = ${input.foodId}
                  LIMIT 1`
              : input.datasetKind === 'recipe'
                ? yield* sql`SELECT NULL::text AS brand, calories_per_100g AS calories,
                      carbohydrates_per_100g AS carbohydrates_total, 'recipe' AS dataset_kind,
                      recipe_id::text AS food_id, NULL::text AS gtin, name,
                      protein_per_100g AS protein, fat_per_100g AS total_fat
                    FROM ${recipes}
                    WHERE profile_id = ${profileId} AND recipe_id = ${input.foodId}
                    LIMIT 1`
                : yield* sql`SELECT brand, calories,
                      coalesce(carbohydrates_total, carbohydrates_available) AS carbohydrates_total,
                      dataset_kind, food_id, gtin, name, protein, total_fat
                    FROM ${foods}
                    WHERE dataset_kind = ${input.datasetKind} AND food_id = ${input.foodId}
                    LIMIT 1`
          const decodedFoods = yield* decodeArray(catalogFoodRowSchema, foodRows)
          const food = decodedFoods[0]
          if (food === undefined) return undefined
          yield* sql`INSERT INTO ${mealLogs} (
                meal_id, profile_id, description, meal_category, logged_at
              ) VALUES (
                ${input.entryId}, ${profileId}, ${food.name}, ${input.mealCategory}, ${input.loggedAt}
              ) ON CONFLICT (meal_id) DO UPDATE SET
                meal_category = ${input.mealCategory}, logged_at = ${input.loggedAt}, updated_at = ${now()}`
          const rows = yield* sql`INSERT INTO ${foodLogEntries} (
                entry_id, meal_id, profile_id, dataset_kind, food_id, name, brand, gtin,
                quantity_grams, meal_category, logged_at, calories_per_100g,
                protein_per_100g, carbohydrates_per_100g, fat_per_100g
              ) VALUES (
                ${input.entryId}, ${input.entryId}, ${profileId}, ${food.dataset_kind}, ${food.food_id}, ${food.name},
                ${food.brand}, ${food.gtin}, ${input.quantityGrams}, ${input.mealCategory},
                ${input.loggedAt}, ${food.calories}, ${food.protein}, ${food.carbohydrates_total},
                ${food.total_fat}
              ) ON CONFLICT (entry_id) DO UPDATE SET
                logged_at = ${input.loggedAt}, meal_category = ${input.mealCategory},
                quantity_grams = ${input.quantityGrams}
              RETURNING *`
          return yield* decodeRequired(
            foodLogEntryRecordSchema,
            rows,
            'Food log upsert returned no row',
          )
        }),
      )
    })

    const listFoodLog = Effect.fn('ApplicationRepository.listFoodLog')(function* (
      profileId: string,
      from: Date,
      to: Date,
    ) {
      const rows = yield* sql`SELECT * FROM ${foodLogEntries}
          WHERE profile_id = ${profileId} AND logged_at >= ${from} AND logged_at < ${to}
          ORDER BY logged_at ASC, entry_id ASC`
      return yield* decodeArray(foodLogEntryRecordSchema, rows)
    })

    const deleteFoodLogEntry = Effect.fn('ApplicationRepository.deleteFoodLogEntry')(function* (
      profileId: string,
      entryId: string,
    ) {
      return yield* sql.withTransaction(
        Effect.gen(function* () {
          const rows = yield* sql<{ readonly meal_id: string }>`DELETE FROM ${foodLogEntries}
              WHERE profile_id = ${profileId} AND entry_id = ${entryId} RETURNING meal_id`
          const mealId = rows[0]?.meal_id
          if (mealId !== undefined)
            yield* sql`DELETE FROM ${mealLogs}
              WHERE profile_id = ${profileId} AND meal_id = ${mealId}
                AND NOT EXISTS (SELECT 1 FROM ${foodLogEntries} WHERE meal_id = ${mealId})`
          return mealId !== undefined
        }),
      )
    })

    const listWeightLog = Effect.fn('ApplicationRepository.listWeightLog')(function* (
      profileId: string,
      from: Date,
      to: Date,
    ) {
      const rows = yield* sql`SELECT * FROM ${weightLogEntries}
          WHERE profile_id = ${profileId} AND measured_at >= ${from} AND measured_at < ${to}
          ORDER BY measured_at ASC, entry_id ASC`
      return yield* decodeArray(weightLogEntryRecordSchema, rows)
    })

    const saveWeightLogEntry = Effect.fn('ApplicationRepository.saveWeightLogEntry')(function* (
      profileId: string,
      input: SaveWeightLogEntryInput,
    ) {
      return yield* sql.withTransaction(
        Effect.gen(function* () {
          yield* ensureProfile(profileId)
          const rows = yield* sql`INSERT INTO ${weightLogEntries}
                (entry_id, profile_id, measured_at, weight_kg)
              VALUES (${input.entryId}, ${profileId}, ${input.measuredAt}, ${input.weightKg})
              ON CONFLICT (entry_id) DO UPDATE SET
                measured_at = ${input.measuredAt}, weight_kg = ${input.weightKg}, updated_at = ${now()}
              RETURNING *`
          return yield* decodeRequired(
            weightLogEntryRecordSchema,
            rows,
            'Weight log upsert returned no row',
          )
        }),
      )
    })

    const deleteWeightLogEntry = Effect.fn('ApplicationRepository.deleteWeightLogEntry')(function* (
      profileId: string,
      entryId: string,
    ) {
      const rows = yield* sql`DELETE FROM ${weightLogEntries}
          WHERE profile_id = ${profileId} AND entry_id = ${entryId} RETURNING entry_id`
      return rows.length > 0
    })

    const saveWorkout = Effect.fn('ApplicationRepository.saveWorkout')(function* (
      profileId: string,
      input: SaveWorkoutInput,
    ) {
      return yield* sql.withTransaction(
        Effect.gen(function* () {
          yield* ensureProfile(profileId)
          const sessionRows = yield* sql`INSERT INTO ${workoutSessions} (
                session_id, profile_id, title, kind, started_at, completed_at,
                duration_minutes, distance_kilometers
              ) VALUES (
                ${input.sessionId}, ${profileId}, ${input.title}, ${input.kind}, ${input.startedAt},
                ${input.completedAt}, ${input.durationMinutes}, ${input.distanceKilometers}
              ) ON CONFLICT (session_id) DO UPDATE SET
                title = ${input.title}, kind = ${input.kind}, started_at = ${input.startedAt},
                completed_at = ${input.completedAt}, duration_minutes = ${input.durationMinutes},
                distance_kilometers = ${input.distanceKilometers}, updated_at = ${now()}
              RETURNING *`
          const session = yield* decodeRequired(
            workoutSessionRowSchema,
            sessionRows,
            'Workout upsert returned no row',
          )
          yield* sql`DELETE FROM ${workoutSets} WHERE session_id = ${input.sessionId}`
          const setRecords = input.sets.map((set, ordinal) => ({
            detail: set.detail,
            ordinal,
            session_id: input.sessionId,
            set_id: set.setId,
            title: set.title,
            value: set.value,
          }))
          if (setRecords.length > 0)
            yield* sql`INSERT INTO ${workoutSets} ${sql.insert(setRecords)}`
          const decodedSets = yield* decodeArray(workoutSetRowSchema, setRecords)
          return { session, sets: decodedSets }
        }),
      )
    })

    const listWorkouts = Effect.fn('ApplicationRepository.listWorkouts')(function* (
      profileId: string,
      from: Date,
      to: Date,
    ) {
      const sessionRows = yield* sql`SELECT * FROM ${workoutSessions}
          WHERE profile_id = ${profileId} AND started_at >= ${from} AND started_at < ${to}
          ORDER BY started_at DESC, session_id ASC`
      const sessions = yield* decodeArray(workoutSessionRowSchema, sessionRows)
      if (sessions.length === 0) return []
      const setRows = yield* sql`SELECT * FROM ${workoutSets}
          WHERE ${sql.in(
            'session_id',
            sessions.map((session) => session.session_id),
          )}
          ORDER BY session_id ASC, ordinal ASC`
      const sets = yield* decodeArray(workoutSetRowSchema, setRows)
      const setsBySession = Map.groupBy(sets, (set) => set.session_id)
      return sessions.map((session) => ({
        session,
        sets: setsBySession.get(session.session_id) ?? [],
      }))
    })

    const deleteWorkout = Effect.fn('ApplicationRepository.deleteWorkout')(function* (
      profileId: string,
      sessionId: string,
    ) {
      const rows = yield* sql`DELETE FROM ${workoutSessions}
          WHERE profile_id = ${profileId} AND session_id = ${sessionId} RETURNING session_id`
      return rows.length > 0
    })

    return ApplicationRepository.of({
      deleteFoodLogEntry,
      deleteWorkout,
      deleteWorkoutTemplate,
      deleteWeightLogEntry,
      ensureProfile,
      ensureProfileForClerkUser,
      getNutritionPlan,
      listFoodLog,
      listWorkouts,
      listWorkoutTemplates,
      listWeightLog,
      profileBelongsToClerkUser,
      saveFoodLogEntry,
      saveNutritionPlan,
      saveWorkout,
      saveWorkoutTemplate,
      saveWeightLogEntry,
    })
  })

export const applicationRepositoryLayer = (
  options: {
    readonly appSchema?: string
    readonly catalogSchema?: string
    readonly now?: () => Date
  } = {},
) => Layer.effect(ApplicationRepository, makeApplicationRepository(options))
