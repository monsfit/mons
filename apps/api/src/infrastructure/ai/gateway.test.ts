import { assert, describe, it } from '@effect/vitest'
import { Effect, Stream } from 'effect'

import {
  AiGateway,
  AiGatewayError,
  type AiGatewayClient,
  defaultAiGatewayModel,
  makeAiGatewayLayer,
} from './gateway.ts'

const failGatewayRequest = async (): Promise<string> =>
  Promise.reject(new Error('gateway unavailable'))

describe('AiGateway', () => {
  const requests: Array<{ readonly model: string; readonly prompt: string }> = []
  const client: AiGatewayClient = {
    streamText: (request) => {
      requests.push(request)
      return (async function* () {
        yield 'clear '
        yield 'blue light'
      })()
    },
  }

  it.layer(makeAiGatewayLayer({ client, model: defaultAiGatewayModel }))((test) => {
    test.effect('streams deterministic chunks through the configured model', () =>
      Effect.gen(function* () {
        const gateway = yield* AiGateway
        const chunks = yield* gateway
          .streamText({ prompt: 'Why is the sky blue?' })
          .pipe(Stream.runCollect)

        assert.deepStrictEqual(chunks, ['clear ', 'blue light'])
        assert.deepStrictEqual(requests, [
          { model: defaultAiGatewayModel, prompt: 'Why is the sky blue?' },
        ])
      }),
    )
  })

  const failingClient: AiGatewayClient = {
    streamText: () =>
      (async function* () {
        yield await failGatewayRequest()
      })(),
  }

  it.layer(makeAiGatewayLayer({ client: failingClient, model: defaultAiGatewayModel }))((test) => {
    test.effect('maps provider failures into a typed gateway error', () =>
      Effect.gen(function* () {
        const gateway = yield* AiGateway
        const error = yield* gateway
          .streamText({ prompt: 'test' })
          .pipe(Stream.runCollect, Effect.flip)

        assert.instanceOf(error, AiGatewayError)
        assert.strictEqual(error.model, defaultAiGatewayModel)
        assert.strictEqual(error.operation, 'streamText')
      }),
    )
  })
})
