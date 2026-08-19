import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import {
  applicationRepositoryLayer,
  catalogReaderLayer,
  createDatabaseLayer,
  migrateApplicationDatabase,
  mealEstimateRepositoryLayer,
  mealLogRepositoryLayer,
  userFoodRepositoryLayer,
} from '@regolith/database'
import { Effect, Layer, Option } from 'effect'
import { HttpRouter } from 'effect/unstable/http'
import * as NodeHttp from 'node:http'

import { apiLayer } from './app.ts'
import { makeAiGatewayLayer } from './ai-gateway.ts'
import { clerkAuthenticatorLayer } from './auth.ts'
import { loadConfig } from './config.ts'
import { makeMealEstimationLayer } from './meal-estimation.ts'
import { makeMealIntelligenceLayer } from './meal-intelligence.ts'
import { mealLoggingLayer } from './meal-logging.ts'
import { r2StorageLayer, r2StorageUnavailableLayer } from './r2-storage.ts'

const program = Effect.gen(function* () {
  const config = yield* loadConfig
  const database = createDatabaseLayer({ connectionString: config.databaseUrl })
  const repositories = Layer.mergeAll(
    catalogReaderLayer(config.schema),
    applicationRepositoryLayer({
      appSchema: config.appSchema,
      catalogSchema: config.schema,
    }),
    userFoodRepositoryLayer({ appSchema: config.appSchema }),
    mealEstimateRepositoryLayer({ appSchema: config.appSchema }),
    mealLogRepositoryLayer({ appSchema: config.appSchema, catalogSchema: config.schema }),
  ).pipe(Layer.provideMerge(database))
  const authentication = clerkAuthenticatorLayer({
    publishableKey: config.clerkPublishableKey,
    secretKey: config.clerkSecretKey,
  })
  const storage = Option.match(config.r2, {
    onNone: () => r2StorageUnavailableLayer,
    onSome: r2StorageLayer,
  })
  const mealIntelligence = makeMealIntelligenceLayer({
    observationModel: config.mealObservationModel,
    resolutionModel: config.mealResolutionModel,
    transcriptionModel: config.mealTranscriptionModel,
  }).pipe(Layer.provide(repositories))
  const mealEstimation = makeMealEstimationLayer({
    observationModel: config.mealObservationModel,
    resolutionModel: config.mealResolutionModel,
    transcriptionModel: config.mealTranscriptionModel,
  }).pipe(Layer.provide(Layer.mergeAll(repositories, mealIntelligence)))
  const mealLogging = mealLoggingLayer.pipe(
    Layer.provide(Layer.mergeAll(repositories, storage, mealIntelligence)),
  )
  const requestServices = Layer.mergeAll(
    repositories,
    makeAiGatewayLayer({ model: config.aiModel }),
    storage,
    mealIntelligence,
    mealEstimation,
    mealLogging,
  )
  const application = apiLayer.pipe(
    Layer.provide(authentication),
    HttpRouter.provideRequest(requestServices),
  )
  const server = HttpRouter.serve(application).pipe(
    Layer.provideMerge(
      NodeHttpServer.layer(NodeHttp.createServer, { host: config.host, port: config.port }),
    ),
  )

  yield* migrateApplicationDatabase(config.appSchema).pipe(Effect.provide(database))
  if (Option.isNone(config.r2)) {
    yield* Effect.logWarning(
      'R2 storage is not configured; core API routes are available, but meal media is disabled',
    )
  }
  yield* Effect.logInfo('Regolith API starting', { host: config.host, port: config.port })
  return yield* Layer.launch(server)
})

NodeRuntime.runMain(program)
