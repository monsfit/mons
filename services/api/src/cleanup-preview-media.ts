import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { NodeRuntime } from '@effect/platform-node'
import { Config, Effect, Redacted } from 'effect'

const program = Effect.gen(function* () {
  const accountId = yield* Config.nonEmptyString('CLOUDFLARE_ACCOUNT_ID')
  const accessKeyId = yield* Config.redacted('R2_ACCESS_KEY_ID')
  const secretAccessKey = yield* Config.redacted('R2_SECRET_ACCESS_KEY')
  const bucket = yield* Config.nonEmptyString('R2_BUCKET').pipe(Config.withDefault('mons'))
  const prefix = yield* Config.nonEmptyString('MONS_STORAGE_PREFIX')
  if (!/^preview\/[a-z0-9][a-z0-9-]{0,22}$/.test(prefix)) {
    return yield* Effect.fail(new Error(`Refusing to delete a non-preview R2 prefix: ${prefix}`))
  }

  const client = new S3Client({
    credentials: {
      accessKeyId: Redacted.value(accessKeyId),
      secretAccessKey: Redacted.value(secretAccessKey),
    },
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    region: 'auto',
  })

  yield* Effect.acquireUseRelease(
    Effect.succeed(client),
    (sdk) =>
      Effect.gen(function* () {
        let continuationToken: string | undefined
        let deleted = 0
        do {
          const page = yield* Effect.tryPromise(() =>
            sdk.send(
              new ListObjectsV2Command({
                Bucket: bucket,
                ContinuationToken: continuationToken,
                Prefix: `${prefix}/`,
              }),
            ),
          )
          const objects = (page.Contents ?? []).flatMap(({ Key }) =>
            Key === undefined ? [] : [{ Key }],
          )
          if (objects.length > 0) {
            yield* Effect.tryPromise(() =>
              sdk.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects } })),
            )
            deleted += objects.length
          }
          continuationToken = page.NextContinuationToken
        } while (continuationToken !== undefined)
        yield* Effect.logInfo('Mons preview media removed', { bucket, deleted, prefix })
      }),
    (sdk) => Effect.sync(() => sdk.destroy()),
  )
})

NodeRuntime.runMain(program)
