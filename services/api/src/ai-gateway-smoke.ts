import { NodeRuntime } from '@effect/platform-node'
import { Effect, Stream } from 'effect'

import { AiGateway, aiGatewayModelConfig, makeAiGatewayLayer } from './ai-gateway.ts'

const prompt = 'Why is the sky blue?'

const program = Effect.gen(function* () {
  const model = yield* aiGatewayModelConfig
  const smoke = Effect.gen(function* () {
    const gateway = yield* AiGateway

    yield* Effect.logInfo('Streaming AI Gateway smoke test', { model })
    yield* gateway
      .streamText({ prompt })
      .pipe(Stream.runForEach((chunk) => Effect.sync(() => process.stdout.write(chunk))))
    yield* Effect.sync(() => process.stdout.write('\n'))
  })

  return yield* smoke.pipe(
    Effect.provide(
      makeAiGatewayLayer({
        model,
      }),
    ),
  )
})

NodeRuntime.runMain(program)
