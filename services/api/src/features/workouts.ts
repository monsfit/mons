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
  validationError,
} from '../core/errors.ts'
import { fromProfileService } from '../core/handler-errors.ts'
import {
  type ProfileAccessDenied,
  type ServicePersistenceError,
  fromRepository,
} from '../core/service-errors.ts'
import { ProfileAccessService } from './profile.ts'
import {
  type SaveWorkout,
  type Workout,
  type WorkoutTemplate,
  profilePathSchema,
  saveWorkoutSchema,
  saveWorkoutTemplateSchema,
  timeRangeQuerySchema,
  workoutPathSchema,
  workoutResponseSchema,
  workoutSchema,
  workoutTemplatePathSchema,
  workoutTemplateResponseSchema,
  workoutTemplateSchema,
} from '@regolith/contracts'
import {
  type SaveWorkoutTemplateInput,
  type WorkoutRecord,
  WorkoutRepository,
  type WorkoutTemplateRecord,
} from '@regolith/database'
import { Context, Effect, Layer } from 'effect'
import {
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from 'effect/unstable/httpapi'

const profileErrors = [
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  NotFoundError,
  ServiceUnavailableError,
  InternalApiError,
]

export const workoutsApi = HttpApiGroup.make('workouts')
  .add(
    HttpApiEndpoint.get('listWorkouts', '/v1/profiles/:profileId/workouts', {
      params: profilePathSchema,
      query: timeRangeQuerySchema,
      success: workoutResponseSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.put('saveWorkout', '/v1/profiles/:profileId/workouts/:sessionId', {
      params: workoutPathSchema,
      payload: saveWorkoutSchema,
      success: workoutSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.delete('deleteWorkout', '/v1/profiles/:profileId/workouts/:sessionId', {
      params: workoutPathSchema,
      error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
    }),
    HttpApiEndpoint.get('listWorkoutTemplates', '/v1/profiles/:profileId/workout-templates', {
      params: profilePathSchema,
      success: workoutTemplateResponseSchema,
      error: profileErrors,
    }),
    HttpApiEndpoint.put(
      'saveWorkoutTemplate',
      '/v1/profiles/:profileId/workout-templates/:templateId',
      {
        params: workoutTemplatePathSchema,
        payload: saveWorkoutTemplateSchema,
        success: workoutTemplateSchema,
        error: profileErrors,
      },
    ),
    HttpApiEndpoint.delete(
      'deleteWorkoutTemplate',
      '/v1/profiles/:profileId/workout-templates/:templateId',
      {
        params: workoutTemplatePathSchema,
        error: [UnauthorizedError, ForbiddenError, NotFoundError, InternalApiError],
      },
    ),
  )
  .middleware(RequestValidation)
  .middleware(Authentication)

export const workoutsHandlers = (api: typeof RegolithApi) =>
  HttpApiBuilder.group(api, 'workouts', (handlers) =>
    handlers.handleAll({
      listWorkouts: ({ params, query }) =>
        Effect.gen(function* () {
          const workouts = yield* WorkoutService
          const identity = yield* CurrentIdentity
          return yield* fromProfileService(
            workouts.list(
              params.profileId,
              identity.userId,
              new Date(query.from),
              new Date(query.to),
            ),
          )
        }),
      saveWorkout: ({ params, payload }) =>
        Effect.gen(function* () {
          if (payload.sessionId.toLowerCase() !== params.sessionId.toLowerCase())
            return yield* validationError('Invalid workout identifiers')
          const workouts = yield* WorkoutService
          const identity = yield* CurrentIdentity
          return yield* fromProfileService(
            workouts.save(params.profileId, identity.userId, payload),
          )
        }),
      deleteWorkout: ({ params }) =>
        Effect.gen(function* () {
          const workouts = yield* WorkoutService
          const identity = yield* CurrentIdentity
          const deleted = yield* fromProfileService(
            workouts.delete(params.profileId, identity.userId, params.sessionId),
          )
          if (!deleted)
            return yield* new NotFoundError({
              code: 'workout_not_found',
              message: 'Workout not found',
            })
          return HttpApiSchema.NoContent.make()
        }),
      listWorkoutTemplates: ({ params }) =>
        Effect.gen(function* () {
          const workouts = yield* WorkoutService
          const identity = yield* CurrentIdentity
          return yield* fromProfileService(
            workouts.listTemplates(params.profileId, identity.userId),
          )
        }),
      saveWorkoutTemplate: ({ params, payload }) =>
        Effect.gen(function* () {
          if (payload.templateId.toLowerCase() !== params.templateId.toLowerCase())
            return yield* validationError('Invalid workout template identifiers')
          const workouts = yield* WorkoutService
          const identity = yield* CurrentIdentity
          return yield* fromProfileService(
            workouts.saveTemplate(params.profileId, identity.userId, payload),
          )
        }),
      deleteWorkoutTemplate: ({ params }) =>
        Effect.gen(function* () {
          const workouts = yield* WorkoutService
          const identity = yield* CurrentIdentity
          const deleted = yield* fromProfileService(
            workouts.deleteTemplate(params.profileId, identity.userId, params.templateId),
          )
          if (!deleted)
            return yield* new NotFoundError({
              code: 'template_not_found',
              message: 'Workout template not found',
            })
          return HttpApiSchema.NoContent.make()
        }),
    }),
  )

export const toWorkout = (record: WorkoutRecord): Workout => ({
  completedAt: record.session.completed_at?.toISOString() ?? null,
  distanceKilometers: record.session.distance_kilometers,
  durationMinutes: record.session.duration_minutes,
  kind: record.session.kind,
  sessionId: record.session.session_id,
  sets: record.sets.map((set) => ({
    detail: set.detail,
    setId: set.set_id,
    title: set.title,
    value: set.value,
  })),
  startedAt: record.session.started_at.toISOString(),
  title: record.session.title,
})

export const toWorkoutTemplate = (record: WorkoutTemplateRecord): WorkoutTemplate => ({
  exercises: record.exercises.map(({ exercise, sets }) => ({
    category: exercise.category,
    equipment: exercise.equipment,
    exerciseId: exercise.exercise_id,
    name: exercise.name,
    notes: exercise.notes,
    sets: sets.map((set) => ({
      repetitions: set.repetitions,
      restSeconds: set.rest_seconds,
      setId: set.template_set_id,
      weightPounds: set.weight_pounds,
    })),
    templateExerciseId: exercise.template_exercise_id,
  })),
  name: record.template.name,
  templateId: record.template.template_id,
})

type WorkoutServiceError = ProfileAccessDenied | ServicePersistenceError

export interface WorkoutServiceShape {
  readonly delete: (
    profileId: string,
    clerkUserId: string,
    sessionId: string,
  ) => Effect.Effect<boolean, WorkoutServiceError>
  readonly deleteTemplate: (
    profileId: string,
    clerkUserId: string,
    templateId: string,
  ) => Effect.Effect<boolean, WorkoutServiceError>
  readonly list: (
    profileId: string,
    clerkUserId: string,
    from: Date,
    to: Date,
  ) => Effect.Effect<{ readonly workouts: ReadonlyArray<Workout> }, WorkoutServiceError>
  readonly listTemplates: (
    profileId: string,
    clerkUserId: string,
  ) => Effect.Effect<{ readonly templates: ReadonlyArray<WorkoutTemplate> }, WorkoutServiceError>
  readonly save: (
    profileId: string,
    clerkUserId: string,
    input: SaveWorkout,
  ) => Effect.Effect<Workout, WorkoutServiceError>
  readonly saveTemplate: (
    profileId: string,
    clerkUserId: string,
    input: SaveWorkoutTemplateInput,
  ) => Effect.Effect<WorkoutTemplate, WorkoutServiceError>
}

export const WorkoutService = Context.Service<WorkoutServiceShape>('@regolith/api/WorkoutService')

export const workoutServiceLayer = Layer.effect(
  WorkoutService,
  Effect.gen(function* () {
    const access = yield* ProfileAccessService
    const repository = yield* WorkoutRepository
    return WorkoutService.of({
      delete: Effect.fn('WorkoutService.delete')(function* (profileId, clerkUserId, sessionId) {
        yield* access.authorize(profileId, clerkUserId)
        return yield* fromRepository(
          'WorkoutRepository.delete',
          repository.delete(profileId, sessionId),
        )
      }),
      deleteTemplate: Effect.fn('WorkoutService.deleteTemplate')(
        function* (profileId, clerkUserId, templateId) {
          yield* access.authorize(profileId, clerkUserId)
          return yield* fromRepository(
            'WorkoutRepository.deleteTemplate',
            repository.deleteTemplate(profileId, templateId),
          )
        },
      ),
      list: Effect.fn('WorkoutService.list')(function* (profileId, clerkUserId, from, to) {
        yield* access.authorize(profileId, clerkUserId)
        const workouts = yield* fromRepository(
          'WorkoutRepository.list',
          repository.list(profileId, from, to),
        )
        return { workouts: workouts.map(toWorkout) }
      }),
      listTemplates: Effect.fn('WorkoutService.listTemplates')(function* (profileId, clerkUserId) {
        yield* access.authorize(profileId, clerkUserId)
        const templates = yield* fromRepository(
          'WorkoutRepository.listTemplates',
          repository.listTemplates(profileId),
        )
        return { templates: templates.map(toWorkoutTemplate) }
      }),
      save: Effect.fn('WorkoutService.save')(function* (profileId, clerkUserId, input) {
        yield* access.authorize(profileId, clerkUserId)
        const workout = yield* fromRepository(
          'WorkoutRepository.save',
          repository.save(profileId, {
            ...input,
            completedAt: input.completedAt === null ? null : new Date(input.completedAt),
            startedAt: new Date(input.startedAt),
          }),
        )
        return toWorkout(workout)
      }),
      saveTemplate: Effect.fn('WorkoutService.saveTemplate')(
        function* (profileId, clerkUserId, input) {
          yield* access.authorize(profileId, clerkUserId)
          const template = yield* fromRepository(
            'WorkoutRepository.saveTemplate',
            repository.saveTemplate(profileId, input),
          )
          return toWorkoutTemplate(template)
        },
      ),
    })
  }),
)
