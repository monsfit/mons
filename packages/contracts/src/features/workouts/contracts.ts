import { Schema } from 'effect'

import {
  boundedInteger,
  boundedNumber,
  identifier,
  isoTimestampSchema,
  nonBlankTextSchema,
  uuidSchema,
} from '../../schema-helpers.ts'

export const workoutKindSchema = Schema.Literals(['strength', 'cardio'])
export const workoutPathSchema = Schema.Struct({ profileId: uuidSchema, sessionId: uuidSchema })
export const workoutTemplatePathSchema = Schema.Struct({
  profileId: uuidSchema,
  templateId: uuidSchema,
})

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

export type SaveWorkout = typeof saveWorkoutSchema.Type
export type Workout = typeof workoutSchema.Type
export type WorkoutKind = typeof workoutKindSchema.Type
export type WorkoutTemplate = typeof workoutTemplateSchema.Type
