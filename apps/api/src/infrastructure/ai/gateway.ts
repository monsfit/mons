import { type LanguageModel, streamText as streamSdkText } from 'ai'
import { Config, Context, Effect, Layer, Schema, Stream } from 'effect'

export const defaultAiGatewayModel = 'google/gemini-3.7-flash'

export const aiGatewayModelConfig = Config.nonEmptyString('AI_GATEWAY_MODEL').pipe(
  Config.withDefault(defaultAiGatewayModel),
)

export interface AiTextRequest {
  readonly prompt: string
}

export class AiGatewayError extends Schema.TaggedErrorClass<AiGatewayError>()('AiGatewayError', {
  cause: Schema.Defect(),
  model: Schema.String,
  operation: Schema.Literal('streamText'),
}) {}

export interface AiGatewayService {
  readonly model: string
  readonly streamText: (request: AiTextRequest) => Stream.Stream<string, AiGatewayError>
}

export class AiGateway extends Context.Service<AiGateway, AiGatewayService>()(
  '@regolith/api/AiGateway',
) {}

export interface AiGatewayClient {
  readonly streamText: (request: {
    readonly model: string
    readonly prompt: string
  }) => AsyncIterable<string>
}

export const makeAiSdkClient = (
  resolveModel: (model: string) => LanguageModel = (model) => model,
): AiGatewayClient => ({
  streamText: (request) => {
    const result = streamSdkText({
      ...request,
      model: resolveModel(request.model),
      // Error events are consumed below and mapped into Effect's typed error channel.
      onError: () => {},
    })
    return (async function* () {
      for await (const part of result.stream) {
        if (part.type === 'error') throw part.error
        if (part.type === 'text-delta') yield part.text
      }
    })()
  },
})

export const makeAiGatewayLayer = (options: {
  readonly client?: AiGatewayClient
  readonly model: string
}) => {
  const client = options.client ?? makeAiSdkClient()
  const toError = (cause: unknown) =>
    AiGatewayError.make({ cause, model: options.model, operation: 'streamText' })

  return Layer.succeed(AiGateway)({
    model: options.model,
    streamText: ({ prompt }) =>
      Stream.unwrap(
        Effect.try({
          try: () => client.streamText({ model: options.model, prompt }),
          catch: toError,
        }).pipe(Effect.map((textStream) => Stream.fromAsyncIterable(textStream, toError))),
      ).pipe(
        Stream.withSpan('AiGateway.streamText', {
          attributes: { 'gen_ai.request.model': options.model },
        }),
      ),
  })
}
