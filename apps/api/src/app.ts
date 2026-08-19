import { Layer } from 'effect'
import { HttpApiBuilder, HttpApiScalar } from 'effect/unstable/httpapi'

import { RegolithApi } from './api.ts'
import { authenticationLayer } from './auth.ts'
import { requestValidationLayer } from './errors.ts'
import { handlerLayers } from './handlers.ts'

const routesLayer = HttpApiBuilder.layer(RegolithApi, {
  openapiPath: '/openapi.json',
}).pipe(
  Layer.provide(handlerLayers),
  Layer.provide(requestValidationLayer),
  Layer.provide(authenticationLayer),
)

const documentationLayer = HttpApiScalar.layer(RegolithApi, {
  path: '/docs',
  scalar: { theme: 'saturn' },
})

export const apiLayer = Layer.merge(routesLayer, documentationLayer)
