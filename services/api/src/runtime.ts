import {
  applicationRepositoryLayer,
  catalogReaderLayer,
  createDatabaseLayer,
  databaseHealthLayer,
  mealEstimateRepositoryLayer,
  mealLogRepositoryLayer,
  userFoodRepositoryLayer,
} from '@mons/database'
import { Layer, Option } from 'effect'
import { HttpRouter } from 'effect/unstable/http'

import { apiLayer } from './app.ts'
import { type AiGatewayClient, makeAiGatewayLayer } from './ai-gateway.ts'
import { clerkAuthenticatorLayer } from './auth.ts'
import type { ApiConfig } from './config.ts'
import { makeMealEstimationLayer } from './meal-estimation.ts'
import { type MealAiClient, makeMealIntelligenceLayer } from './meal-intelligence.ts'
import { mealLoggingLayer } from './meal-logging.ts'
import { R2Storage, r2StorageLayer, r2StorageUnavailableLayer } from './r2-storage.ts'

export interface ApiRuntimeOptions {
  readonly aiClient?: AiGatewayClient
  readonly databaseMaxConnections?: number
  readonly mealAiClient?: MealAiClient
  readonly storage?: Layer.Layer<R2Storage>
}

export const makeApiApplication = (config: ApiConfig, options: ApiRuntimeOptions = {}) => {
  const database = createDatabaseLayer({
    connectionString: config.databaseUrl,
    ...(options.databaseMaxConnections === undefined
      ? {}
      : { maximumPoolSize: options.databaseMaxConnections }),
  })
  const repositories = Layer.mergeAll(
    databaseHealthLayer,
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
  const storage =
    options.storage ??
    Option.match(config.r2, {
      onNone: () => r2StorageUnavailableLayer,
      onSome: r2StorageLayer,
    })
  const mealIntelligence = makeMealIntelligenceLayer({
    ...(options.mealAiClient === undefined ? {} : { client: options.mealAiClient }),
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
  // HttpRouter.provideRequest builds and releases this layer inside every request
  // scope. In Workers, that keeps the pg pool and its sockets request-local while
  // Hyperdrive owns the long-lived pool to the origin database.
  const requestServices = Layer.mergeAll(
    repositories,
    makeAiGatewayLayer({
      ...(options.aiClient === undefined ? {} : { client: options.aiClient }),
      model: config.aiModel,
    }),
    storage,
    mealIntelligence,
    mealEstimation,
    mealLogging,
  )

  return apiLayer.pipe(Layer.provide(authentication), HttpRouter.provideRequest(requestServices))
}
