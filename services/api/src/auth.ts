import { createClerkClient } from '@clerk/backend'
import { Context, Data, Effect, Layer, Redacted } from 'effect'
import { HttpServerRequest } from 'effect/unstable/http'
import { HttpApiMiddleware, HttpApiSecurity } from 'effect/unstable/httpapi'

import { UnauthorizedError, unauthorizedError } from './errors.ts'

export interface AuthenticatedIdentity {
  readonly userId: string
}

export class AuthenticationError extends Data.TaggedError('AuthenticationError')<{
  readonly cause: unknown
}> {}

export interface RequestAuthenticatorService {
  readonly authenticate: (
    request: Request,
  ) => Effect.Effect<AuthenticatedIdentity | undefined, AuthenticationError>
}

export const RequestAuthenticator = Context.Service<RequestAuthenticatorService>(
  '@regolith/api/RequestAuthenticator',
)

export class CurrentIdentity extends Context.Service<CurrentIdentity, AuthenticatedIdentity>()(
  '@regolith/api/CurrentIdentity',
) {}

export class Authentication extends HttpApiMiddleware.Service<
  Authentication,
  { provides: CurrentIdentity }
>()('@regolith/api/Authentication', {
  error: UnauthorizedError,
  security: { bearerAuth: HttpApiSecurity.bearer },
}) {}

export const clerkAuthenticatorLayer = (options: {
  readonly publishableKey: string
  readonly secretKey: string
}) =>
  Layer.sync(RequestAuthenticator, () => {
    const clerk = createClerkClient(options)
    return RequestAuthenticator.of({
      authenticate: (request) =>
        Effect.tryPromise({
          try: () => clerk.authenticateRequest(request, { acceptsToken: 'session_token' }),
          catch: (cause) => new AuthenticationError({ cause }),
        }).pipe(
          Effect.map((state) => {
            if (!state.isAuthenticated) return undefined
            const { userId } = state.toAuth()
            return userId === null ? undefined : { userId }
          }),
        ),
    })
  })

export const authenticationLayer = Layer.effect(
  Authentication,
  Effect.gen(function* () {
    const authenticator = yield* RequestAuthenticator
    return Authentication.of({
      bearerAuth: (httpEffect, { credential }) =>
        Effect.gen(function* () {
          const serverRequest = yield* HttpServerRequest.HttpServerRequest
          // Reading the credential here ensures the security scheme is exercised;
          // Clerk remains the authority for token validity and session state.
          void Redacted.value(credential)
          const request =
            serverRequest.source instanceof Request
              ? serverRequest.source
              : new Request(new URL(serverRequest.url, 'http://localhost'), {
                  headers: serverRequest.headers,
                  method: serverRequest.method,
                })
          const identity = yield* authenticator
            .authenticate(request)
            .pipe(Effect.catch(() => Effect.succeed(undefined)))
          if (identity === undefined) return yield* unauthorizedError()
          return yield* Effect.provideService(httpEffect, CurrentIdentity, identity)
        }),
    })
  }),
)
