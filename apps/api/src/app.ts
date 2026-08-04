import { Scalar } from '@scalar/hono-api-reference'
import type { ApplicationRepository, CatalogReader } from '@regolith/database'
import { Hono } from 'hono'
import { openAPIRouteHandler } from 'hono-openapi'

import { createRoutes } from './routes.js'

const documentation = {
  documentation: {
    info: {
      description: 'Regolith food catalog API',
      title: 'Regolith API',
      version: '0.1.0',
    },
    openapi: '3.1.0' as const,
  },
}

export function createApp(catalog: CatalogReader, application: ApplicationRepository): Hono {
  const routes = createRoutes(catalog, application)
  const app = new Hono()

  app.route('/', routes)
  app.get('/openapi.json', openAPIRouteHandler(routes, documentation))
  app.get('/docs', Scalar({ theme: 'saturn', url: '/openapi.json' }))
  app.notFound((context) =>
    context.json({ code: 'route_not_found', message: 'Route not found' }, 404),
  )
  app.onError((error, context) => {
    console.error(error)
    return context.json({ code: 'internal_error', message: 'Internal server error' }, 500)
  })

  return app
}

export { documentation }
