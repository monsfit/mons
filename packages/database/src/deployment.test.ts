import { describe, expect, it } from 'vitest'

import { deploymentIdentity } from './deployment.ts'

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

  it('rejects obsolete personal deployment stages', () => {
    expect(() => deploymentIdentity({ stage: 'jeremy' })).toThrow(
      'Unknown deployment stage: jeremy',
    )
  })
})
