export const canonicalStages = ['dev', 'production'] as const

export type DeploymentScope = 'dev' | 'production'

export interface DeploymentIdentity {
  readonly apiDomain: string
  readonly appSchema: string
  readonly catalogSchema: 'mons_catalog'
  readonly database: 'dev' | 'production'
  readonly r2Prefix: string
  readonly scope: DeploymentScope
  readonly stage: string
}

export const deploymentIdentity = (input: { readonly stage: string }): DeploymentIdentity => {
  if (input.stage === 'production') {
    return {
      apiDomain: 'api.mons.fit',
      appSchema: 'mons_app',
      catalogSchema: 'mons_catalog',
      database: 'production',
      r2Prefix: 'production',
      scope: 'production',
      stage: input.stage,
    }
  }
  if (input.stage === 'dev') {
    return {
      apiDomain: 'api.dev.mons.fit',
      appSchema: 'mons_app',
      catalogSchema: 'mons_catalog',
      database: 'dev',
      r2Prefix: 'dev',
      scope: 'dev',
      stage: input.stage,
    }
  }

  throw new Error(`Unknown deployment stage: ${input.stage}`)
}
