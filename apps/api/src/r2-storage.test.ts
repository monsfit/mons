import { assert, describe, it } from '@effect/vitest'
import { Effect } from 'effect'

import {
  InvalidR2ObjectKey,
  R2ObjectNotFound,
  R2Storage,
  R2StorageUnavailable,
  type R2Client,
  type R2BucketBinding,
  makeR2BindingStorageLayer,
  makeR2StorageLayer,
  r2Endpoint,
  r2StorageUnavailableLayer,
} from './r2-storage.ts'

describe('R2Storage', () => {
  const objects = new Map<string, { readonly body: Uint8Array; readonly contentType?: string }>()
  const client: R2Client = {
    deleteObject: async (key) => {
      objects.delete(key)
    },
    getObject: async (key) => {
      const object = objects.get(key)
      return object === undefined
        ? undefined
        : {
            body: object.body.slice(),
            contentType: object.contentType,
            etag: `etag-${key}`,
          }
    },
    putObject: async (input) => {
      objects.set(input.key, {
        body: input.body.slice(),
        ...(input.contentType === undefined ? {} : { contentType: input.contentType }),
      })
    },
  }

  it.layer(makeR2StorageLayer({ bucket: 'mons', client }))((test) => {
    test.effect('round-trips and deletes bytes deterministically', () =>
      Effect.gen(function* () {
        const storage = yield* R2Storage
        const body = new TextEncoder().encode('recipe image')

        yield* storage.putObject({ body, contentType: 'image/jpeg', key: 'recipes/r-1.jpg' })
        const stored = yield* storage.getObject('recipes/r-1.jpg')
        assert.strictEqual(storage.bucket, 'mons')
        assert.deepStrictEqual(stored.body, body)
        assert.strictEqual(stored.contentType, 'image/jpeg')
        assert.strictEqual(stored.etag, 'etag-recipes/r-1.jpg')

        yield* storage.deleteObject('recipes/r-1.jpg')
        const missing = yield* storage.getObject('recipes/r-1.jpg').pipe(Effect.flip)
        assert.instanceOf(missing, R2ObjectNotFound)
      }),
    )

    test.effect('rejects blank object keys before calling the client', () =>
      Effect.gen(function* () {
        const storage = yield* R2Storage
        const error = yield* storage
          .putObject({ body: new Uint8Array(), key: '  ' })
          .pipe(Effect.flip)
        assert.instanceOf(error, InvalidR2ObjectKey)
      }),
    )
  })

  it('builds an account endpoint without placing the bucket in the URL', () => {
    assert.strictEqual(
      r2Endpoint('59724eca0ed8946b29fdf2319593fd1b'),
      'https://59724eca0ed8946b29fdf2319593fd1b.r2.cloudflarestorage.com',
    )
  })

  it.layer(
    makeR2BindingStorageLayer({
      binding: {
        delete: async (key) => {
          objects.delete(key)
        },
        get: async (key) => {
          const object = objects.get(key)
          if (object === undefined) return null
          const bytes = object.body.slice()
          return {
            arrayBuffer: () =>
              Promise.resolve(
                bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
              ),
            etag: `native-${key}`,
            ...(object.contentType === undefined
              ? {}
              : { httpMetadata: { contentType: object.contentType } }),
          }
        },
        put: async (key, value, options) => {
          objects.set(key, {
            body: value.slice(),
            ...(options?.httpMetadata?.contentType === undefined
              ? {}
              : { contentType: options.httpMetadata.contentType }),
          })
        },
      } satisfies R2BucketBinding,
      bucket: 'mons',
    }),
  )((test) => {
    test.effect('uses a native Cloudflare R2 binding without credentials', () =>
      Effect.gen(function* () {
        const storage = yield* R2Storage
        const body = new TextEncoder().encode('native binding')
        yield* storage.putObject({ body, contentType: 'text/plain', key: 'native/test.txt' })
        const stored = yield* storage.getObject('native/test.txt')
        assert.deepStrictEqual(stored.body, body)
        assert.strictEqual(stored.contentType, 'text/plain')
        assert.strictEqual(stored.etag, 'native-native/test.txt')
      }),
    )
  })

  it.effect('keeps non-media routes bootable when R2 is not configured', () =>
    Effect.gen(function* () {
      const storage = yield* R2Storage
      const error = yield* storage
        .putObject({ body: new Uint8Array(), key: 'meals/example.jpg' })
        .pipe(Effect.flip)

      assert.instanceOf(error, R2StorageUnavailable)
      assert.strictEqual(error.operation, 'putObject')
    }).pipe(Effect.provide(r2StorageUnavailableLayer)),
  )
})
