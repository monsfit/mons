import {
  catalogReaderLayer,
  createDatabaseLayer,
  databaseHealthLayer,
  legacyFoodLogRepositoryLayer,
  libraryRepositoryLayer,
  mealEstimateRepositoryLayer,
  mealLogRepositoryLayer,
  nutritionPlanRepositoryLayer,
  profileRepositoryLayer,
  weightRepositoryLayer,
  workoutRepositoryLayer,
} from '@mons/database'
import { Layer, Option } from 'effect'
import { HttpRouter } from 'effect/unstable/http'

import { apiLayer } from './app.ts'
import { type AiGatewayClient, makeAiGatewayLayer } from './infrastructure/ai/gateway.ts'
import type { ApiConfig } from './core/config.ts'
import { catalogServiceLayer } from './features/catalog.ts'
import { libraryServiceLayer } from './features/library.ts'
import {
  legacyFoodLogServiceLayer,
  makeMealEstimationLayer,
  type MealAiClient,
  makeMealIntelligenceLayer,
  makeMealLoggingLayer,
} from './features/meals.ts'
import { nutritionServiceLayer } from './features/nutrition.ts'
import { profileAccessServiceLayer, profileServiceLayer } from './features/profile.ts'
import { systemServiceLayer } from './features/system.ts'
import { weightServiceLayer } from './features/weight.ts'
import { workoutServiceLayer } from './features/workouts.ts'
import {
  R2Storage,
  r2StorageLayer,
  r2StorageUnavailableLayer,
} from './infrastructure/storage/r2-storage.ts'
import { clerkAuthenticatorLayer } from './infrastructure/auth/clerk-authenticator.ts'

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
    profileRepositoryLayer({ appSchema: config.appSchema }),
    nutritionPlanRepositoryLayer({ appSchema: config.appSchema }),
    legacyFoodLogRepositoryLayer({
      appSchema: config.appSchema,
      catalogSchema: config.schema,
    }),
    libraryRepositoryLayer({ appSchema: config.appSchema }),
    weightRepositoryLayer({ appSchema: config.appSchema }),
    workoutRepositoryLayer({ appSchema: config.appSchema }),
    mealEstimateRepositoryLayer({ appSchema: config.appSchema }),
    mealLogRepositoryLayer({ appSchema: config.appSchema, catalogSchema: config.schema }),
  ).pipe(Layer.provideMerge(database))
  const profileAccess = profileAccessServiceLayer.pipe(Layer.provide(repositories))
  const featureServices = Layer.mergeAll(
    systemServiceLayer,
    catalogServiceLayer,
    profileServiceLayer,
    nutritionServiceLayer,
    legacyFoodLogServiceLayer,
    libraryServiceLayer,
    weightServiceLayer,
    workoutServiceLayer,
  ).pipe(Layer.provide(Layer.mergeAll(repositories, profileAccess)))
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
  const mealLogging = makeMealLoggingLayer({
    storagePrefix: config.storagePrefix ?? 'local',
  }).pipe(Layer.provide(Layer.mergeAll(repositories, storage, mealIntelligence)))
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
    profileAccess,
    featureServices,
  )

  return apiLayer.pipe(Layer.provide(authentication), HttpRouter.provideRequest(requestServices))
}
