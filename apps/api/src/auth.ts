import { createClerkClient } from '@clerk/backend'
import type { ApplicationRepository } from '@regolith/database'
import { createMiddleware } from 'hono/factory'

export interface AuthenticatedIdentity {
  userId: string
}

export interface RequestAuthenticator {
  authenticate(request: Request): Promise<AuthenticatedIdentity | undefined>
}

export interface AuthVariables {
  auth: AuthenticatedIdentity
}

export function createClerkRequestAuthenticator(options: {
  publishableKey: string
  secretKey: string
}): RequestAuthenticator {
  const clerk = createClerkClient(options)

  return {
    async authenticate(request) {
      const state = await clerk.authenticateRequest(request, { acceptsToken: 'session_token' })
      if (!state.isAuthenticated) return undefined

      const { userId } = state.toAuth()
      return userId === null ? undefined : { userId }
    },
  }
}

export function createAuthenticationMiddleware(authenticator: RequestAuthenticator) {
  return createMiddleware<{ Variables: AuthVariables }>(async (context, next) => {
    const identity = await authenticator.authenticate(context.req.raw)
    if (identity === undefined) {
      return context.json({ code: 'unauthorized', message: 'Authentication required' }, 401)
    }

    context.set('auth', identity)
    await next()
  })
}

export function createProfileAuthorizationMiddleware(application: ApplicationRepository) {
  return createMiddleware<{ Variables: AuthVariables }>(async (context, next) => {
    const { userId } = context.get('auth')
    const profileId = context.req.param('profileId')
    if (
      profileId === undefined ||
      !(await application.profileBelongsToClerkUser(profileId, userId))
    ) {
      return context.json({ code: 'forbidden', message: 'Profile access denied' }, 403)
    }
    await next()
  })
}
