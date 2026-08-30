export const canonicalStages = ['dev', 'production'] as const

export type DeploymentScope = 'live' | 'dev' | 'production'

export interface DeploymentIdentity {
  readonly apiDomain: string
  readonly appSchema: string
  readonly catalogSchema: 'mons_catalog'
  readonly database: 'personal' | 'dev' | 'production'
  readonly r2Prefix: string
  readonly scope: DeploymentScope
  readonly stage: string
}

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const boundedSlug = (value: string, maximumLength: number) => {
  const normalized = slug(value) || 'stage'
  if (normalized.length <= maximumLength) return normalized
  return normalized.slice(0, maximumLength).replace(/-+$/g, '')
}

export const stageIdFromName = (stage: string) => boundedSlug(stage, 50)

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

  const liveStage = stageIdFromName(input.stage)
  return {
    apiDomain: `${liveStage}.api.dev.mons.fit`,
    appSchema: 'mons_app',
    catalogSchema: 'mons_catalog',
    database: 'personal',
    r2Prefix: `live/${liveStage}`,
    scope: 'live',
    stage: input.stage,
  }
}
