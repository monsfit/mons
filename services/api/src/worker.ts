import { HttpRouter, HttpServer } from 'effect/unstable/http'
import { Layer, Option } from 'effect'
import { createWorkersAI } from 'workers-ai-provider'

import { defaultAiGatewayModel, makeAiSdkClient } from './infrastructure/ai/gateway.ts'
import type { ApiConfig } from './core/config.ts'
import { makeWorkerCatalogCacheLayer } from './infrastructure/cache/catalog-cache.ts'
import {
  defaultMealObservationModel,
  defaultMealResolutionModel,
  defaultMealTranscriptionModel,
  makeMealAiClient,
} from './features/meals.ts'
import { makeR2BindingStorageLayer } from './infrastructure/storage/r2-storage.ts'
import { makeApiApplication } from './runtime.ts'

declare global {
  interface CacheStorage {
    readonly default: Cache
  }
}

const makeHandler = (environment: Env, context: ExecutionContext, requestOrigin: string) => {
  const workersAi = createWorkersAI({
    binding: environment.Ai,
    gateway: { id: environment.AI_GATEWAY_ID },
  })
  const config: ApiConfig = {
    aiModel: defaultAiGatewayModel,
    appSchema: environment.MONS_APP_SCHEMA,
    clerkPublishableKey: environment.CLERK_PUBLISHABLE_KEY,
    clerkSecretKey: environment.CLERK_SECRET_KEY,
    databaseUrl: environment.Database.connectionString,
    host: '0.0.0.0',
    mealObservationModel: defaultMealObservationModel,
    mealResolutionModel: defaultMealResolutionModel,
    mealTranscriptionModel: defaultMealTranscriptionModel,
    port: 3000,
    r2: Option.none(),
    schema: environment.MONS_CATALOG_SCHEMA,
    storagePrefix: environment.MONS_STORAGE_PREFIX,
  }
  const application = makeApiApplication(config, {
    aiClient: makeAiSdkClient((model) => workersAi(model)),
    // This Effect pg pool is rebuilt by provideRequest for every fetch. One
    // connection is sufficient because Hyperdrive performs the shared pooling.
    databaseMaxConnections: 1,
    catalogCache: makeWorkerCatalogCacheLayer({
      cache: caches.default,
      namespace: environment.MONS_STAGE,
      origin: requestOrigin,
      waitUntil: context.waitUntil.bind(context),
    }),
    mealAiClient: makeMealAiClient({
      languageModel: (model) => workersAi(model),
    }),
    storage: makeR2BindingStorageLayer({
      binding: environment.Media,
      bucket: environment.R2_BUCKET_NAME,
    }),
  })
  return HttpRouter.toWebHandler(application.pipe(Layer.provide(HttpServer.layerServices)))
}

export default {
  async fetch(request, environment, context): Promise<Response> {
    const { dispose, handler } = makeHandler(environment, context, new URL(request.url).origin)
    try {
      return await handler(request)
    } catch (error) {
      console.error('Mons Worker request failed', error)
      throw error
    } finally {
      await dispose()
    }
  },
} satisfies ExportedHandler<Env>
