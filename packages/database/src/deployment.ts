import { createHash } from 'node:crypto'

export const canonicalStages = ['dev', 'production'] as const

export type DeploymentScope = 'live' | 'preview' | 'dev' | 'production'

export interface DeploymentIdentity {
  readonly apiDomain: string
  readonly appSchema: string
  readonly branchId?: string
  readonly catalogSchema: 'mons_catalog'
  readonly database: 'dev' | 'production'
  readonly r2Prefix: string
  readonly scope: DeploymentScope
  readonly stage: string
}

const hash = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 6)

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const boundedSlug = (value: string, maximumLength: number) => {
  const normalized = slug(value) || 'branch'
  if (normalized.length <= maximumLength) return normalized
  const suffix = hash(value)
  return `${normalized.slice(0, maximumLength - suffix.length - 1).replace(/-+$/g, '')}-${suffix}`
}

/** A collision-resistant branch identifier that still fits in a 32-character schema name. */
export const branchIdFromName = (branch: string) => {
  const prefix = (slug(branch) || 'branch').slice(0, 16).replace(/-+$/g, '')
  return `${prefix}-${hash(branch)}`
}

export const stageIdFromName = (stage: string) => boundedSlug(stage, 50)

export const appSchemaFromBranchId = (branchId: string) => {
  const safeId = boundedSlug(branchId, 23)
  return `mons_app_${safeId.replaceAll('-', '_')}`
}

export const isProtectedBranch = (branch: string | undefined) =>
  branch === undefined || branch === 'dev' || branch === 'main' || branch === 'production'

export const previewStageFromBranch = (branch: string) => `preview-${branchIdFromName(branch)}`

export const deploymentIdentity = (input: {
  readonly stage: string
  readonly branch?: string
}): DeploymentIdentity => {
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

  if (input.stage.startsWith('preview-')) {
    const branchId = boundedSlug(input.stage.slice('preview-'.length), 23)
    return {
      apiDomain: `${branchId}.api.dev.mons.fit`,
      appSchema: appSchemaFromBranchId(branchId),
      branchId,
      catalogSchema: 'mons_catalog',
      database: 'dev',
      r2Prefix: `preview/${branchId}`,
      scope: 'preview',
      stage: input.stage,
    }
  }

  const liveStage = stageIdFromName(input.stage)
  const featureBranch = isProtectedBranch(input.branch) ? undefined : input.branch
  const branchId = branchIdFromName(featureBranch ?? `live-${liveStage}`)
  return {
    apiDomain: `${liveStage}.api.dev.mons.fit`,
    appSchema: appSchemaFromBranchId(branchId),
    ...(featureBranch === undefined ? {} : { branchId }),
    catalogSchema: 'mons_catalog',
    database: 'dev',
    r2Prefix: featureBranch === undefined ? `live/${liveStage}` : `preview/${branchId}`,
    scope: 'live',
    stage: input.stage,
  }
}
