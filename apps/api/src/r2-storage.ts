import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3'
import { Config, Context, Effect, Layer, Redacted, Schema } from 'effect'

export interface R2Config {
  readonly accessKeyId: Redacted.Redacted<string>
  readonly accountId: string
  readonly bucket: string
  readonly secretAccessKey: Redacted.Redacted<string>
}

export const r2Config = Config.all({
  accessKeyId: Config.redacted('R2_ACCESS_KEY_ID'),
  accountId: Config.nonEmptyString('R2_ACCOUNT_ID'),
  bucket: Config.nonEmptyString('R2_BUCKET_NAME').pipe(Config.withDefault('mons')),
  secretAccessKey: Config.redacted('R2_SECRET_ACCESS_KEY'),
})

export interface R2Object {
  readonly body: Uint8Array
  readonly contentType: string | undefined
  readonly etag: string | undefined
}

export interface PutR2Object {
  readonly body: Uint8Array
  readonly contentType?: string
  readonly key: string
}

export class InvalidR2ObjectKey extends Schema.TaggedErrorClass<InvalidR2ObjectKey>()(
  'InvalidR2ObjectKey',
  {
    key: Schema.String,
    reason: Schema.Literal('empty'),
  },
) {}

export class R2ObjectNotFound extends Schema.TaggedErrorClass<R2ObjectNotFound>()(
  'R2ObjectNotFound',
  {
    key: Schema.String,
  },
) {}

export class R2StorageError extends Schema.TaggedErrorClass<R2StorageError>()('R2StorageError', {
  cause: Schema.Defect(),
  key: Schema.String,
  operation: Schema.String,
}) {}

export class R2StorageUnavailable extends Schema.TaggedErrorClass<R2StorageUnavailable>()(
  'R2StorageUnavailable',
  {
    operation: Schema.String,
  },
) {}

export type R2OperationError = InvalidR2ObjectKey | R2StorageError | R2StorageUnavailable

export interface R2StorageService {
  readonly bucket: string
  readonly deleteObject: (key: string) => Effect.Effect<void, R2OperationError>
  readonly getObject: (key: string) => Effect.Effect<R2Object, R2ObjectNotFound | R2OperationError>
  readonly putObject: (input: PutR2Object) => Effect.Effect<void, R2OperationError>
}

export class R2Storage extends Context.Service<R2Storage, R2StorageService>()(
  '@regolith/api/R2Storage',
) {}

export interface R2Client {
  readonly deleteObject: (key: string) => Promise<void>
  readonly getObject: (key: string) => Promise<R2Object | undefined>
  readonly putObject: (input: PutR2Object) => Promise<void>
}

export const r2Endpoint = (accountId: string) => `https://${accountId}.r2.cloudflarestorage.com`

const validateKey = Effect.fn('R2Storage.validateKey')(function* (key: string) {
  if (key.trim().length === 0) {
    return yield* InvalidR2ObjectKey.make({ key, reason: 'empty' })
  }
  return key
})

const makeService = (bucket: string, client: R2Client): R2StorageService => {
  const toStorageError = (operation: string, key: string) => (cause: unknown) =>
    R2StorageError.make({ cause, key, operation })

  return R2Storage.of({
    bucket,
    deleteObject: Effect.fn('R2Storage.deleteObject')(function* (candidate: string) {
      const key = yield* validateKey(candidate)
      yield* Effect.tryPromise({
        try: () => client.deleteObject(key),
        catch: toStorageError('deleteObject', key),
      })
    }),
    getObject: Effect.fn('R2Storage.getObject')(function* (candidate: string) {
      const key = yield* validateKey(candidate)
      const object = yield* Effect.tryPromise({
        try: () => client.getObject(key),
        catch: toStorageError('getObject', key),
      })
      if (object === undefined) return yield* R2ObjectNotFound.make({ key })
      return object
    }),
    putObject: Effect.fn('R2Storage.putObject')(function* (input: PutR2Object) {
      const key = yield* validateKey(input.key)
      yield* Effect.tryPromise({
        try: () => client.putObject({ ...input, key }),
        catch: toStorageError('putObject', key),
      })
    }),
  })
}

export const makeR2StorageLayer = (options: {
  readonly bucket: string
  readonly client: R2Client
}) => Layer.succeed(R2Storage)(makeService(options.bucket, options.client))

const unavailable = (operation: string) => Effect.fail(R2StorageUnavailable.make({ operation }))

export const r2StorageUnavailableLayer = Layer.succeed(R2Storage)(
  R2Storage.of({
    bucket: 'unconfigured',
    deleteObject: Effect.fn('R2Storage.deleteObjectUnavailable')(() => unavailable('deleteObject')),
    getObject: Effect.fn('R2Storage.getObjectUnavailable')(() => unavailable('getObject')),
    putObject: Effect.fn('R2Storage.putObjectUnavailable')(() => unavailable('putObject')),
  }),
)

const makeSdkClient = (config: R2Config) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const sdk = new S3Client({
        credentials: {
          accessKeyId: Redacted.value(config.accessKeyId),
          secretAccessKey: Redacted.value(config.secretAccessKey),
        },
        endpoint: r2Endpoint(config.accountId),
        region: 'auto',
      })
      const client: R2Client = {
        deleteObject: async (key) => {
          await sdk.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }))
        },
        getObject: async (key) => {
          try {
            const response = await sdk.send(
              new GetObjectCommand({ Bucket: config.bucket, Key: key }),
            )
            if (response.Body === undefined) return undefined
            return {
              body: await response.Body.transformToByteArray(),
              contentType: response.ContentType,
              etag: response.ETag,
            }
          } catch (cause) {
            if (
              cause instanceof NoSuchKey ||
              (cause instanceof S3ServiceException && cause.$metadata.httpStatusCode === 404)
            ) {
              return undefined
            }
            throw cause
          }
        },
        putObject: async (input) => {
          const object = { Bucket: config.bucket, Body: input.body, Key: input.key }
          const command =
            input.contentType === undefined
              ? new PutObjectCommand(object)
              : new PutObjectCommand({ ...object, ContentType: input.contentType })
          await sdk.send(command)
        },
      }
      return { client, sdk }
    }),
    ({ sdk }) => Effect.sync(() => sdk.destroy()),
  ).pipe(Effect.map(({ client }) => makeService(config.bucket, client)))

export const r2StorageLayer = (config: R2Config) => Layer.effect(R2Storage, makeSdkClient(config))
