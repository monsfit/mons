import { MealEstimateRepository, type MealEstimateRecord } from '@regolith/database'
import type { CreateMealEstimate, MealEstimate } from '@regolith/contracts'
import { Context, Effect, Layer, Schema } from 'effect'

import {
  MealIntelligence,
  type MealAnalysis,
  type MealIntelligenceError,
  mealPromptVersion,
} from './meal-intelligence.ts'

export class InvalidMealMedia extends Schema.TaggedErrorClass<InvalidMealMedia>()(
  'InvalidMealMedia',
  {
    message: Schema.String,
  },
) {}

export class MealEstimationError extends Schema.TaggedErrorClass<MealEstimationError>()(
  'MealEstimationError',
  {
    cause: Schema.Defect(),
    operation: Schema.Literals(['analyze', 'load', 'persist']),
  },
) {}

export type MealEstimationOperationError =
  | InvalidMealMedia
  | MealEstimationError
  | MealIntelligenceError

export interface MealEstimationService {
  readonly create: (
    profileId: string,
    input: CreateMealEstimate,
  ) => Effect.Effect<MealEstimate, MealEstimationOperationError>
  readonly findById: (
    profileId: string,
    estimateId: string,
  ) => Effect.Effect<MealEstimate | undefined, MealEstimationError>
}

export class MealEstimation extends Context.Service<MealEstimation, MealEstimationService>()(
  '@regolith/api/MealEstimation',
) {}

const decodeBase64 = Effect.fn('MealEstimation.decodeBase64')(function* (encoded: string) {
  if (encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
    return yield* InvalidMealMedia.make({ message: 'Media must be canonical base64' })
  const bytes = Buffer.from(encoded, 'base64')
  if (bytes.byteLength === 0)
    return yield* InvalidMealMedia.make({ message: 'Media cannot be empty' })
  return bytes
})

const toMealEstimate = (record: MealEstimateRecord): MealEstimate => ({
  calories: record.estimate.calories,
  carbohydrates: record.estimate.carbohydrates,
  createdAt: record.estimate.created_at.toISOString(),
  description: record.estimate.description,
  estimateId: record.estimate.estimate_id,
  inputKind: record.estimate.input_kind,
  items: record.items.map((item) => ({
    amountGrams: item.amount_grams,
    calories: item.calories,
    carbohydrates: item.carbohydrates,
    confidence: item.confidence,
    description: item.description,
    evidence: item.evidence,
    foodId: item.food_id,
    name: item.name,
    ordinal: item.ordinal,
    protein: item.protein,
    resolved: item.resolved,
    sourceKind: item.source_kind,
    totalFat: item.total_fat,
  })),
  mediaRetained: record.estimate.media_object_key !== null,
  overallConfidence: record.estimate.overall_confidence,
  protein: record.estimate.protein,
  status: record.estimate.status,
  totalFat: record.estimate.total_fat,
  transcript: record.estimate.transcript,
  unresolvedItems: record.items.filter((item) => !item.resolved).map((item) => item.description),
})

export const makeMealEstimationLayer = (options: {
  readonly observationModel: string
  readonly resolutionModel: string
  readonly transcriptionModel: string
}) =>
  Layer.effect(
    MealEstimation,
    Effect.gen(function* () {
      const intelligence = yield* MealIntelligence
      const repository = yield* MealEstimateRepository
      const mapRepositoryError = (operation: 'load' | 'persist') => (cause: unknown) =>
        MealEstimationError.make({ cause, operation })

      const persist = Effect.fn('MealEstimation.persist')(function* (input: {
        readonly analysis: MealAnalysis
        readonly estimateId: string
        readonly inputDescription: string
        readonly inputKind: 'text' | 'photo' | 'voice'
        readonly mediaContentType: string | null
        readonly mediaObjectKey: string | null
        readonly mediaSha256: string | null
        readonly profileId: string
        readonly transcript: string | null
      }) {
        return yield* repository
          .save({
            ...input.analysis,
            estimateId: input.estimateId,
            inputDescription: input.inputDescription,
            inputKind: input.inputKind,
            items: input.analysis.items,
            mediaContentType: input.mediaContentType,
            mediaObjectKey: input.mediaObjectKey,
            mediaSha256: input.mediaSha256,
            observationModel: options.observationModel,
            profileId: input.profileId,
            promptVersion: mealPromptVersion,
            resolutionModel: options.resolutionModel,
            transcript: input.transcript,
            transcriptionModel: input.inputKind === 'voice' ? options.transcriptionModel : null,
          })
          .pipe(Effect.mapError(mapRepositoryError('persist')), Effect.map(toMealEstimate))
      })

      const analyzeMedia = Effect.fn('MealEstimation.analyzeMedia')(function* (
        profileId: string,
        input: Extract<CreateMealEstimate, { readonly kind: 'photo' | 'voice' }>,
      ) {
        const bytes = yield* decodeBase64(input.dataBase64)
        if (input.kind === 'photo') {
          const analysis = yield* intelligence.analyzePhoto(
            profileId,
            bytes,
            input.mediaType,
            input.description,
          )
          return yield* persist({
            analysis,
            estimateId: input.estimateId,
            inputDescription: input.description ?? '',
            inputKind: input.kind,
            mediaContentType: null,
            mediaObjectKey: null,
            mediaSha256: null,
            profileId,
            transcript: null,
          })
        }
        const transcript = yield* intelligence.transcribe(bytes, input.mediaType)
        const analysis = yield* intelligence.analyzeText(profileId, transcript)
        return yield* persist({
          analysis,
          estimateId: input.estimateId,
          inputDescription: transcript,
          inputKind: input.kind,
          mediaContentType: null,
          mediaObjectKey: null,
          mediaSha256: null,
          profileId,
          transcript,
        })
      })

      return MealEstimation.of({
        create: Effect.fn('MealEstimation.create')(function* (profileId, input) {
          yield* Effect.annotateCurrentSpan({
            'meal.estimate.id': input.estimateId,
            'meal.input.kind': input.kind,
          })
          if (input.kind !== 'text') return yield* analyzeMedia(profileId, input)
          const analysis = yield* intelligence.analyzeText(profileId, input.description)
          return yield* persist({
            analysis,
            estimateId: input.estimateId,
            inputDescription: input.description,
            inputKind: input.kind,
            mediaContentType: null,
            mediaObjectKey: null,
            mediaSha256: null,
            profileId,
            transcript: null,
          })
        }),
        findById: Effect.fn('MealEstimation.findById')(function* (profileId, estimateId) {
          const found = yield* repository
            .findById(profileId, estimateId)
            .pipe(Effect.mapError(mapRepositoryError('load')))
          return found === undefined ? undefined : toMealEstimate(found)
        }),
      })
    }),
  )
