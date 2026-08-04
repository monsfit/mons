import * as v from 'valibot'

export const datasetKindSchema = v.picklist(['raw', 'branded'])
export const mealCategorySchema = v.picklist(['breakfast', 'lunch', 'dinner', 'snack'])
export const workoutKindSchema = v.picklist(['strength', 'cardio'])
export const dailyActivitySchema = v.picklist([
  'mostly_sedentary',
  'moderately_active',
  'very_active',
])
export const exerciseFrequencySchema = v.picklist([
  'none',
  'one_to_three',
  'four_to_six',
  'seven_plus',
])
export const metabolicSexSchema = v.picklist(['female', 'male'])
export const weightGoalSchema = v.picklist(['lose', 'maintain', 'gain'])

const uuidSchema = v.pipe(v.string(), v.uuid())
const isoTimestampSchema = v.pipe(v.string(), v.isoTimestamp())
const nonBlankTextSchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200))

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

export const foodPortionSchema = v.pipe(
  v.object({
    amount: v.pipe(v.number(), v.finite(), v.minValue(0.1)),
    name: nonBlankTextSchema,
    unit: v.picklist(['g', 'ml']),
  }),
  v.description('Normalized household portion'),
  v.metadata({ ref: 'FoodPortion' }),
)

export const foodSummarySchema = v.pipe(
  v.object({
    brand: v.nullable(v.string()),
    calories: v.nullable(v.number()),
    carbohydrates: v.nullable(v.number()),
    datasetKind: datasetKindSchema,
    foodId: v.string(),
    gtin: v.nullable(v.string()),
    name: v.string(),
    portions: v.array(foodPortionSchema),
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

export const profilePathSchema = v.object({ profileId: uuidSchema })

export const foodLogEntryPathSchema = v.object({
  entryId: uuidSchema,
  profileId: uuidSchema,
})

export const workoutPathSchema = v.object({
  profileId: uuidSchema,
  sessionId: uuidSchema,
})

export const weightLogEntryPathSchema = v.object({
  entryId: uuidSchema,
  profileId: uuidSchema,
})

export const timeRangeQuerySchema = v.pipe(
  v.object({ from: isoTimestampSchema, to: isoTimestampSchema }),
  v.check((range) => Date.parse(range.from) < Date.parse(range.to), 'from must be before to'),
)

export const profileSchema = v.pipe(
  v.object({ profileId: uuidSchema }),
  v.metadata({ ref: 'Profile' }),
)

const nutritionPlanFields = {
  birthDate: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/)),
  currentWeightKg: v.pipe(v.number(), v.finite(), v.minValue(30), v.maxValue(350)),
  dailyActivity: dailyActivitySchema,
  exerciseFrequency: exerciseFrequencySchema,
  heightCm: v.pipe(v.number(), v.finite(), v.minValue(100), v.maxValue(250)),
  metabolicSex: metabolicSexSchema,
  targetWeightKg: v.pipe(v.number(), v.finite(), v.minValue(30), v.maxValue(350)),
  weeklyWeightChangePercent: v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(1.25)),
  weightGoal: weightGoalSchema,
}

export const saveNutritionPlanSchema = v.pipe(
  v.object(nutritionPlanFields),
  v.check(
    (plan) =>
      (plan.weightGoal === 'lose' && plan.targetWeightKg < plan.currentWeightKg) ||
      (plan.weightGoal === 'gain' && plan.targetWeightKg > plan.currentWeightKg) ||
      (plan.weightGoal === 'maintain' &&
        plan.targetWeightKg === plan.currentWeightKg &&
        plan.weeklyWeightChangePercent === 0),
    'Weight target and rate must match the selected goal',
  ),
  v.check(
    (plan) =>
      plan.weightGoal === 'maintain' ||
      (plan.weeklyWeightChangePercent >= 0.1 && plan.weeklyWeightChangePercent <= 1.25),
    'Change goals require a weekly rate between 0.1% and 1.25%',
  ),
  v.metadata({ ref: 'SaveNutritionPlan' }),
)

export const nutritionPlanSchema = v.pipe(
  v.object({
    ...nutritionPlanFields,
    calculatedAt: isoTimestampSchema,
    calorieTargetKcal: v.pipe(v.number(), v.integer(), v.minValue(1_000)),
    estimatedExpenditureKcal: v.pipe(v.number(), v.integer(), v.minValue(1)),
    estimatedWeeks: v.nullable(v.pipe(v.number(), v.finite(), v.minValue(0))),
    rateLimited: v.boolean(),
    restingEnergyKcal: v.pipe(v.number(), v.integer(), v.minValue(1)),
  }),
  v.metadata({ ref: 'NutritionPlan' }),
)

export const nutritionPlanResponseSchema = v.pipe(
  v.object({ plan: v.nullable(nutritionPlanSchema) }),
  v.metadata({ ref: 'NutritionPlanResponse' }),
)

export const createFoodLogEntrySchema = v.pipe(
  v.object({
    datasetKind: datasetKindSchema,
    entryId: uuidSchema,
    foodId: v.pipe(v.string(), v.regex(/^\d+$/)),
    loggedAt: isoTimestampSchema,
    mealCategory: mealCategorySchema,
    quantityGrams: v.pipe(v.number(), v.finite(), v.minValue(0.1), v.maxValue(100_000)),
  }),
  v.metadata({ ref: 'CreateFoodLogEntry' }),
)

export const foodLogEntrySchema = v.pipe(
  v.object({
    brand: v.nullable(v.string()),
    calories: v.nullable(v.number()),
    carbohydrates: v.nullable(v.number()),
    datasetKind: datasetKindSchema,
    entryId: uuidSchema,
    fat: v.nullable(v.number()),
    foodId: v.string(),
    gtin: v.nullable(v.string()),
    loggedAt: isoTimestampSchema,
    mealCategory: mealCategorySchema,
    name: v.string(),
    protein: v.nullable(v.number()),
    quantityGrams: v.number(),
  }),
  v.metadata({ ref: 'FoodLogEntry' }),
)

export const foodLogResponseSchema = v.pipe(
  v.object({ entries: v.array(foodLogEntrySchema) }),
  v.metadata({ ref: 'FoodLogResponse' }),
)

export const createWeightLogEntrySchema = v.pipe(
  v.object({
    entryId: uuidSchema,
    measuredAt: isoTimestampSchema,
    weightKg: v.pipe(v.number(), v.finite(), v.minValue(30), v.maxValue(350)),
  }),
  v.metadata({ ref: 'CreateWeightLogEntry' }),
)

export const weightLogEntrySchema = v.pipe(
  v.object({
    entryId: uuidSchema,
    measuredAt: isoTimestampSchema,
    weightKg: v.number(),
  }),
  v.metadata({ ref: 'WeightLogEntry' }),
)

export const weightLogResponseSchema = v.pipe(
  v.object({ entries: v.array(weightLogEntrySchema) }),
  v.metadata({ ref: 'WeightLogResponse' }),
)

export const workoutSetSchema = v.pipe(
  v.object({
    detail: v.pipe(v.string(), v.maxLength(500)),
    setId: uuidSchema,
    title: nonBlankTextSchema,
    value: v.pipe(v.string(), v.maxLength(200)),
  }),
  v.metadata({ ref: 'WorkoutSet' }),
)

export const saveWorkoutSchema = v.pipe(
  v.object({
    completedAt: v.nullable(isoTimestampSchema),
    distanceKilometers: v.nullable(
      v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(100_000)),
    ),
    durationMinutes: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(10_080)),
    kind: workoutKindSchema,
    sessionId: uuidSchema,
    sets: v.pipe(v.array(workoutSetSchema), v.maxLength(500)),
    startedAt: isoTimestampSchema,
    title: nonBlankTextSchema,
  }),
  v.check(
    (workout) =>
      workout.completedAt === null ||
      Date.parse(workout.startedAt) <= Date.parse(workout.completedAt),
    'completedAt must not be before startedAt',
  ),
  v.check(
    (workout) => workout.kind === 'cardio' || workout.distanceKilometers === null,
    'distanceKilometers is only valid for cardio workouts',
  ),
  v.metadata({ ref: 'SaveWorkout' }),
)

export const workoutSchema = v.pipe(
  v.object({
    completedAt: v.nullable(isoTimestampSchema),
    distanceKilometers: v.nullable(v.number()),
    durationMinutes: v.number(),
    kind: workoutKindSchema,
    sessionId: uuidSchema,
    sets: v.array(workoutSetSchema),
    startedAt: isoTimestampSchema,
    title: v.string(),
  }),
  v.metadata({ ref: 'Workout' }),
)

export const workoutResponseSchema = v.pipe(
  v.object({ workouts: v.array(workoutSchema) }),
  v.metadata({ ref: 'WorkoutResponse' }),
)

export type CatalogStatus = v.InferOutput<typeof catalogStatusSchema>
export type DailyActivity = v.InferOutput<typeof dailyActivitySchema>
export type DatasetKind = v.InferOutput<typeof datasetKindSchema>
export type FoodLogEntry = v.InferOutput<typeof foodLogEntrySchema>
export type FoodPortion = v.InferOutput<typeof foodPortionSchema>
export type FoodSearchQuery = v.InferOutput<typeof foodSearchQuerySchema>
export type FoodSummary = v.InferOutput<typeof foodSummarySchema>
export type Health = v.InferOutput<typeof healthSchema>
export type MealCategory = v.InferOutput<typeof mealCategorySchema>
export type MetabolicSex = v.InferOutput<typeof metabolicSexSchema>
export type NutritionPlan = v.InferOutput<typeof nutritionPlanSchema>
export type SaveNutritionPlan = v.InferOutput<typeof saveNutritionPlanSchema>
export type SaveWorkout = v.InferOutput<typeof saveWorkoutSchema>
export type Workout = v.InferOutput<typeof workoutSchema>
export type WorkoutKind = v.InferOutput<typeof workoutKindSchema>
export type ExerciseFrequency = v.InferOutput<typeof exerciseFrequencySchema>
export type WeightGoal = v.InferOutput<typeof weightGoalSchema>
export type WeightLogEntry = v.InferOutput<typeof weightLogEntrySchema>
