import { HttpRouter, HttpServer } from 'effect/unstable/http'
import { Layer, Option } from 'effect'
import { Resource } from 'sst'
import { createWorkersAI } from 'workers-ai-provider'

import { defaultAiGatewayModel, makeAiSdkClient } from './infrastructure/ai/gateway.ts'
import type { ApiConfig } from './core/config.ts'
import {
  defaultMealObservationModel,
  defaultMealResolutionModel,
  defaultMealTranscriptionModel,
  makeMealAiClient,
} from './features/meals.ts'
import {
  type R2BucketBinding,
  makeR2BindingStorageLayer,
} from './infrastructure/storage/r2-storage.ts'
import { makeApiApplication } from './runtime.ts'

const resources = Resource as unknown as {
  readonly Ai: unknown
  readonly App: { readonly stage: string }
  readonly ClerkSecretKey: { readonly value: string }
  readonly Database: { readonly connectionString: string }
  readonly Media: R2BucketBinding & { readonly name: string }
  readonly PublicConfig: { readonly clerkPublishableKey: string }
}

const makeHandler = () => {
  const gatewayId = `mons-${resources.App.stage}`
  const workersAi = createWorkersAI({
    binding: resources.Ai,
    gateway: { id: gatewayId },
  } as unknown as Parameters<typeof createWorkersAI>[0])
  const config: ApiConfig = {
    aiModel: defaultAiGatewayModel,
    appSchema: 'regolith_app',
    clerkPublishableKey: resources.PublicConfig.clerkPublishableKey,
    clerkSecretKey: resources.ClerkSecretKey.value,
    databaseUrl: resources.Database.connectionString,
    host: '0.0.0.0',
    mealObservationModel: defaultMealObservationModel,
    mealResolutionModel: defaultMealResolutionModel,
    mealTranscriptionModel: defaultMealTranscriptionModel,
    port: 3000,
    r2: Option.none(),
    schema: 'regolith',
  }
  const application = makeApiApplication(config, {
    aiClient: makeAiSdkClient((model) => workersAi(model)),
    // This Effect pg pool is rebuilt by provideRequest for every fetch. One
    // connection is sufficient because Hyperdrive performs the shared pooling.
    databaseMaxConnections: 1,
    mealAiClient: makeMealAiClient({
      languageModel: (model) => workersAi(model),
    }),
    storage: makeR2BindingStorageLayer({
      binding: resources.Media,
      bucket: resources.Media.name,
    }),
  })
  return HttpRouter.toWebHandler(application.pipe(Layer.provide(HttpServer.layerServices)))
}

export default {
  async fetch(request: Request): Promise<Response> {
    const { dispose, handler } = makeHandler()
    const response = await handler(request)
    await dispose()
    return response
  },
}
