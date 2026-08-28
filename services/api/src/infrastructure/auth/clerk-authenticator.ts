import { createClerkClient } from '@clerk/backend'
import { Effect, Layer } from 'effect'

import { AuthenticationError, RequestAuthenticator } from '../../core/auth.ts'

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
