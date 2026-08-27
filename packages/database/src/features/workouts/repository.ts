import { Context, Effect, Layer, Schema } from 'effect'
import { SqlClient } from 'effect/unstable/sql'

import {
  RepositoryInvariantError,
  RepositoryOwnershipError,
  type RepositoryError,
  decodeRequiredRow,
  decodeRows,
} from '../../core/repository.ts'
import { validateSchemaName } from '../../migrations.ts'
import type { WorkoutKind } from '../../types.ts'

const workoutSessionRowSchema = Schema.Struct({
  completed_at: Schema.NullOr(Schema.Date),
  created_at: Schema.Date,
  distance_kilometers: Schema.NullOr(Schema.Number),
  duration_minutes: Schema.Number,
  kind: Schema.Literals(['strength', 'cardio']),
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

export type WorkoutSessionRow = typeof workoutSessionRowSchema.Type
export type WorkoutSetRow = typeof workoutSetRowSchema.Type
export type WorkoutTemplateRow = typeof workoutTemplateRowSchema.Type
export type WorkoutTemplateExerciseRow = typeof workoutTemplateExerciseRowSchema.Type
export type WorkoutTemplateSetRow = typeof workoutTemplateSetRowSchema.Type

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

export interface WorkoutRepositoryService {
  readonly delete: (profileId: string, sessionId: string) => Effect.Effect<boolean, RepositoryError>
  readonly deleteTemplate: (
    profileId: string,
    templateId: string,
  ) => Effect.Effect<boolean, RepositoryError>
  readonly list: (
    profileId: string,
    from: Date,
    to: Date,
  ) => Effect.Effect<ReadonlyArray<WorkoutRecord>, RepositoryError>
  readonly listTemplates: (
    profileId: string,
  ) => Effect.Effect<ReadonlyArray<WorkoutTemplateRecord>, RepositoryError>
  readonly save: (
    profileId: string,
    input: SaveWorkoutInput,
  ) => Effect.Effect<WorkoutRecord, RepositoryError>
  readonly saveTemplate: (
    profileId: string,
    input: SaveWorkoutTemplateInput,
  ) => Effect.Effect<WorkoutTemplateRecord, RepositoryError>
}

export const WorkoutRepository = Context.Service<WorkoutRepositoryService>(
  '@regolith/database/WorkoutRepository',
)

export const makeWorkoutRepository = (
  options: { readonly appSchema?: string; readonly now?: () => Date } = {},
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const appSchema = yield* validateSchemaName(options.appSchema ?? 'regolith_app')
    const now = options.now ?? (() => new Date())
    const profiles = sql(`${appSchema}.profiles`)
    const workoutSessions = sql(`${appSchema}.workout_sessions`)
    const workoutSets = sql(`${appSchema}.workout_sets`)
    const workoutTemplates = sql(`${appSchema}.workout_templates`)
    const workoutTemplateExercises = sql(`${appSchema}.workout_template_exercises`)
    const workoutTemplateSets = sql(`${appSchema}.workout_template_sets`)

    const ensureProfile = (profileId: string) =>
      sql`INSERT INTO ${profiles} (profile_id, clerk_user_id)
        VALUES (${profileId}, NULL)
        ON CONFLICT (profile_id) DO UPDATE SET updated_at = ${now()}`

    const listTemplates = Effect.fn('WorkoutRepository.listTemplates')(function* (
      profileId: string,
    ) {
      const templates = yield* decodeRows(
        workoutTemplateRowSchema,
        yield* sql`SELECT * FROM ${workoutTemplates}
          WHERE profile_id = ${profileId} ORDER BY updated_at DESC, template_id`,
      )
      if (templates.length === 0) return []
      const exercises = yield* decodeRows(
        workoutTemplateExerciseRowSchema,
        yield* sql`SELECT * FROM ${workoutTemplateExercises}
          WHERE ${sql.in(
            'template_id',
            templates.map((template) => template.template_id),
          )}
          ORDER BY template_id, ordinal`,
      )
      const setRows =
        exercises.length === 0
          ? []
          : yield* sql`SELECT * FROM ${workoutTemplateSets}
              WHERE ${sql.in(
                'template_exercise_id',
                exercises.map((exercise) => exercise.template_exercise_id),
              )}
              ORDER BY template_exercise_id, ordinal`
      const sets = yield* decodeRows(workoutTemplateSetRowSchema, setRows)
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

    const saveTemplate = Effect.fn('WorkoutRepository.saveTemplate')(function* (
      profileId: string,
      input: SaveWorkoutTemplateInput,
    ) {
      yield* sql.withTransaction(
        Effect.gen(function* () {
          yield* ensureProfile(profileId)
          const owners = yield* sql<{ readonly belongs_to_profile: boolean }>`
            SELECT profile_id = ${profileId} AS belongs_to_profile
            FROM ${workoutTemplates} WHERE template_id = ${input.templateId}`
          if (owners[0] !== undefined && !owners[0].belongs_to_profile)
            return yield* new RepositoryOwnershipError({
              message: 'Workout template does not belong to this profile',
            })
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
      const saved = (yield* listTemplates(profileId)).find(
        (template) => template.template.template_id === input.templateId.toLowerCase(),
      )
      if (saved === undefined)
        return yield* new RepositoryInvariantError({
          message: 'Saved workout template could not be loaded',
        })
      return saved
    })

    const deleteTemplate = Effect.fn('WorkoutRepository.deleteTemplate')(function* (
      profileId: string,
      templateId: string,
    ) {
      const rows = yield* sql`DELETE FROM ${workoutTemplates}
        WHERE profile_id = ${profileId} AND template_id = ${templateId} RETURNING template_id`
      return rows.length > 0
    })

    const save = Effect.fn('WorkoutRepository.save')(function* (
      profileId: string,
      input: SaveWorkoutInput,
    ) {
      return yield* sql.withTransaction(
        Effect.gen(function* () {
          yield* ensureProfile(profileId)
          const session = yield* decodeRequiredRow(
            workoutSessionRowSchema,
            yield* sql`INSERT INTO ${workoutSessions} (
                session_id, profile_id, title, kind, started_at, completed_at,
                duration_minutes, distance_kilometers
              ) VALUES (
                ${input.sessionId}, ${profileId}, ${input.title}, ${input.kind}, ${input.startedAt},
                ${input.completedAt}, ${input.durationMinutes}, ${input.distanceKilometers}
              ) ON CONFLICT (session_id) DO UPDATE SET
                title = ${input.title}, kind = ${input.kind}, started_at = ${input.startedAt},
                completed_at = ${input.completedAt}, duration_minutes = ${input.durationMinutes},
                distance_kilometers = ${input.distanceKilometers}, updated_at = ${now()}
              RETURNING *`,
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
          return { session, sets: yield* decodeRows(workoutSetRowSchema, setRecords) }
        }),
      )
    })

    const list = Effect.fn('WorkoutRepository.list')(function* (
      profileId: string,
      from: Date,
      to: Date,
    ) {
      const sessions = yield* decodeRows(
        workoutSessionRowSchema,
        yield* sql`SELECT * FROM ${workoutSessions}
          WHERE profile_id = ${profileId} AND started_at >= ${from} AND started_at < ${to}
          ORDER BY started_at DESC, session_id ASC`,
      )
      if (sessions.length === 0) return []
      const sets = yield* decodeRows(
        workoutSetRowSchema,
        yield* sql`SELECT * FROM ${workoutSets}
          WHERE ${sql.in(
            'session_id',
            sessions.map((session) => session.session_id),
          )}
          ORDER BY session_id ASC, ordinal ASC`,
      )
      const setsBySession = Map.groupBy(sets, (set) => set.session_id)
      return sessions.map((session) => ({
        session,
        sets: setsBySession.get(session.session_id) ?? [],
      }))
    })

    const deleteWorkout = Effect.fn('WorkoutRepository.delete')(function* (
      profileId: string,
      sessionId: string,
    ) {
      const rows = yield* sql`DELETE FROM ${workoutSessions}
        WHERE profile_id = ${profileId} AND session_id = ${sessionId} RETURNING session_id`
      return rows.length > 0
    })

    return WorkoutRepository.of({
      delete: deleteWorkout,
      deleteTemplate,
      list,
      listTemplates,
      save,
      saveTemplate,
    })
  })

export const workoutRepositoryLayer = (
  options: { readonly appSchema?: string; readonly now?: () => Date } = {},
) => Layer.effect(WorkoutRepository, makeWorkoutRepository(options))
