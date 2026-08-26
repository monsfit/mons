export default $config({
  app(input) {
    return {
      name: 'regolith',
      home: 'cloudflare',
      protect: input?.stage === 'production',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      providers: {
        cloudflare: '6.19.0',
      },
    }
  },
  async run() {
    const accountId = '59724eca0ed8946b29fdf2319593fd1b'
    const hyperdriveIds = {
      dev: '8c533f1b36d644fab96b3ebe4cb5bc08',
      production: '0d5ed6f6c3c94a6c8efca2deb51ea2ea',
    } as const
    if ($app.stage !== 'dev' && $app.stage !== 'production') {
      throw new Error(`Unsupported stage: ${$app.stage}`)
    }

    const database = sst.cloudflare.Hyperdrive.get('Database', {
      hyperdriveId: hyperdriveIds[$app.stage],
    })
    const media = new sst.Linkable('Media', {
      include: [
        sst.cloudflare.binding({
          type: 'r2BucketBindings',
          properties: { bucketName: 'mons' },
        }),
      ],
      properties: { name: 'mons' },
    })
    const aiGateway = new cloudflare.AiGateway('AiGateway', {
      accountId,
      aiGatewayId: `mons-${$app.stage}`,
      cacheInvalidateOnUpdate: true,
      cacheTtl: 0,
      collectLogs: false,
      rateLimitingInterval: 0,
      rateLimitingLimit: 0,
      retryBackoff: 'exponential',
      retryDelay: 250,
      retryMaxAttempts: 2,
      workersAiBillingMode: 'postpaid',
      zdr: true,
    })
    const ai = new sst.cloudflare.Ai('Ai')
    const clerkSecretKey = new sst.Secret('ClerkSecretKey')
    const publicConfig = new sst.Linkable('PublicConfig', {
      properties: {
        clerkPublishableKey: 'pk_test_YmlnLWNvdy04Mi5jbGVyay5hY2NvdW50cy5kZXYk',
      },
    })
    const api = new sst.cloudflare.Worker('Api', {
      compatibility: {
        date: '2026-08-23',
        flags: ['nodejs_compat', 'global_fetch_strictly_public'],
      },
      handler: 'apps/api/src/worker.ts',
      link: [database, ai, media, clerkSecretKey, publicConfig],
      placement: { mode: 'smart' },
      url: true,
    })
    return {
      aiGatewayId: aiGateway.aiGatewayId,
      apiUrl: api.url,
    }
  },
})
