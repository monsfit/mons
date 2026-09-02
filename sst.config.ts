export default $config({
  app(input) {
    return {
      name: 'mons',
      home: 'cloudflare',
      protect: input?.stage === 'production',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      providers: {
        cloudflare: '6.19.0',
      },
    }
  },
  async run() {
    const { deploymentIdentity } = await import('./packages/database/src/deployment.ts')
    const accountId = '59724eca0ed8946b29fdf2319593fd1b'
    const deployment = deploymentIdentity({ stage: $app.stage })
    const hyperdriveId =
      deployment.database === 'production'
        ? '0d5ed6f6c3c94a6c8efca2deb51ea2ea'
        : deployment.database === 'dev'
          ? '8c533f1b36d644fab96b3ebe4cb5bc08'
          : process.env.MONS_PERSONAL_HYPERDRIVE_ID
    if (!hyperdriveId) {
      throw new Error(
        'MONS_PERSONAL_HYPERDRIVE_ID is required for personal SST stages. See docs/development-environments.md.',
      )
    }

    const database = sst.cloudflare.Hyperdrive.get('Database', {
      hyperdriveId,
    })
    const databaseConfig = new sst.Linkable('DatabaseConfig', {
      properties: {
        appSchema: deployment.appSchema,
        catalogSchema: deployment.catalogSchema,
        r2Prefix: deployment.r2Prefix,
        scope: deployment.scope,
      },
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
      domain: deployment.apiDomain,
      handler: 'services/api/src/worker.ts',
      link: [database, databaseConfig, ai, media, clerkSecretKey, publicConfig],
      placement: { mode: 'smart' },
      url: true,
    })
    new sst.x.DevCommand('DatabaseMigration', {
      dev: {
        autostart: true,
        command: 'pnpm db:migrate',
        title: 'Database migration',
      },
      environment: {
        MONS_APP_SCHEMA: deployment.appSchema,
        MONS_STORAGE_PREFIX: deployment.r2Prefix,
      },
    })
    return {
      aiGatewayId: aiGateway.aiGatewayId,
      apiUrl: `https://${deployment.apiDomain}`,
      appSchema: deployment.appSchema,
      r2Prefix: deployment.r2Prefix,
      workerUrl: api.url,
    }
  },
})
