import { describe, expect, it } from 'vitest'

import {
  appSchemaFromBranchId,
  branchIdFromName,
  deploymentIdentity,
  previewStageFromBranch,
} from './deployment.ts'

describe('deployment identity', () => {
  it('uses fixed canonical environments', () => {
    expect(deploymentIdentity({ stage: 'dev' })).toMatchObject({
      apiDomain: 'api.dev.mons.fit',
      appSchema: 'mons_app',
      database: 'dev',
      scope: 'dev',
    })
    expect(deploymentIdentity({ stage: 'production' })).toMatchObject({
      apiDomain: 'api.mons.fit',
      appSchema: 'mons_app',
      database: 'production',
      scope: 'production',
    })
  })

  it('shares a feature branch schema between Live and Preview', () => {
    const live = deploymentIdentity({ stage: 'jeremy', branch: 'feature/meal-logging' })
    const preview = deploymentIdentity({ stage: previewStageFromBranch('feature/meal-logging') })
    expect(live.apiDomain).toBe('jeremy.api.dev.mons.fit')
    expect(preview.apiDomain).toBe(`${live.branchId}.api.dev.mons.fit`)
    expect(live.appSchema).toBe(preview.appSchema)
    expect(live.r2Prefix).toBe(preview.r2Prefix)
  })

  it('keeps hostile and long branch names within PostgreSQL and DNS limits', () => {
    const id = branchIdFromName('Feature/THIS is a very long branch name with $hell metacharacters')
    const schema = appSchemaFromBranchId(id)
    expect(id).toMatch(/^[a-z0-9][a-z0-9-]*$/)
    expect(id.length).toBeLessThanOrEqual(23)
    expect(schema).toMatch(/^[a-z_][a-z0-9_]*$/)
    expect(schema.length).toBeLessThanOrEqual(32)
  })

  it('isolates personal work on a protected branch', () => {
    const identity = deploymentIdentity({ stage: 'jeremy', branch: 'main' })
    expect(identity.appSchema).not.toBe('mons_app')
    expect(identity.r2Prefix).toBe('live/jeremy')
  })
})
