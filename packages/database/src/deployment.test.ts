import { describe, expect, it } from 'vitest'

import { deploymentIdentity, stageIdFromName } from './deployment.ts'

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

  it('uses the stable personal database for Live development', () => {
    const live = deploymentIdentity({ stage: 'jeremy' })
    expect(live.apiDomain).toBe('jeremy.api.dev.mons.fit')
    expect(live.database).toBe('personal')
    expect(live.appSchema).toBe('mons_app')
    expect(live.r2Prefix).toBe('live/jeremy')
  })

  it('keeps arbitrary personal stage names DNS-safe', () => {
    const id = stageIdFromName('Jeremy / Local Development')
    expect(id).toBe('jeremy-local-development')
    expect(id).toMatch(/^[a-z0-9][a-z0-9-]*$/)
    expect(id.length).toBeLessThanOrEqual(50)
  })
})
