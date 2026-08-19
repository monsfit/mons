import { NodeFileSystem, NodeRuntime } from '@effect/platform-node'
import {
  catalogReaderLayer,
  createDatabaseLayer,
  userFoodRepositoryLayer,
} from '@regolith/database'
import { Config, Effect, FileSystem, Layer } from 'effect'

import {
  MealIntelligence,
  makeMealIntelligenceLayer,
  mealObservationModelConfig,
  mealResolutionModelConfig,
  mealTranscriptionModelConfig,
} from './meal-intelligence.ts'

const program = Effect.gen(function* () {
  const databaseUrl = yield* Config.string('DATABASE_URL').pipe(
    Config.withDefault('postgresql://regolith:regolith_local@localhost:5432/regolith'),
  )
  const catalogSchema = yield* Config.string('REGOLITH_SCHEMA').pipe(Config.withDefault('regolith'))
  const appSchema = yield* Config.string('REGOLITH_APP_SCHEMA').pipe(
    Config.withDefault('regolith_app'),
  )
  const observationModel = yield* mealObservationModelConfig
  const resolutionModel = yield* mealResolutionModelConfig
  const transcriptionModel = yield* mealTranscriptionModelConfig
  const audioPath = yield* Config.string('MEAL_SMOKE_AUDIO_PATH').pipe(Config.withDefault(''))
  const database = createDatabaseLayer({ connectionString: databaseUrl })
  const repositories = Layer.mergeAll(
    catalogReaderLayer(catalogSchema),
    userFoodRepositoryLayer({ appSchema }),
  ).pipe(Layer.provide(database))
  const intelligence = makeMealIntelligenceLayer({
    observationModel,
    resolutionModel,
    transcriptionModel,
  }).pipe(Layer.provide(repositories))

  const result = yield* Effect.gen(function* () {
    const service = yield* MealIntelligence
    const description =
      audioPath.length > 0
        ? yield* Effect.gen(function* () {
            const fileSystem = yield* FileSystem.FileSystem
            const bytes = yield* fileSystem.readFile(audioPath)
            return yield* service.transcribe(bytes)
          })
        : 'Two fried eggs and one slice of whole wheat toast.'
    return yield* service.analyzeText('00000000-0000-4000-8000-000000000000', description)
  }).pipe(Effect.provide(intelligence))

  yield* Effect.logInfo('Meal intelligence smoke test passed', {
    calories: result.calories,
    items: result.items.map((item) => ({
      amountGrams: item.amountGrams,
      foodId: item.foodId,
      name: item.name,
      resolved: item.resolved,
      sourceKind: item.sourceKind,
    })),
    unresolvedItems: result.unresolvedItems,
  })
})

NodeRuntime.runMain(program.pipe(Effect.provide(NodeFileSystem.layer)))
