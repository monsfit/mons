import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Effect, Layer, Option } from 'effect'
import { HttpRouter } from 'effect/unstable/http'
import * as NodeHttp from 'node:http'

import { loadConfig } from './config.ts'
import { makeApiApplication } from './runtime.ts'

const program = Effect.gen(function* () {
  const config = yield* loadConfig
  const application = makeApiApplication(config)
  const server = HttpRouter.serve(application).pipe(
    Layer.provideMerge(
      NodeHttpServer.layer(NodeHttp.createServer, { host: config.host, port: config.port }),
    ),
  )

  if (Option.isNone(config.r2)) {
    yield* Effect.logWarning(
      'R2 storage is not configured; core API routes are available, but meal media is disabled',
    )
  }
  yield* Effect.logInfo('Mons API starting', { host: config.host, port: config.port })
  return yield* Layer.launch(server)
})

NodeRuntime.runMain(program)
