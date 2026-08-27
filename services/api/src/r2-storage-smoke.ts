import { NodeRuntime } from '@effect/platform-node'
import { Effect } from 'effect'

import {
  R2ObjectNotFound,
  R2Storage,
  R2StorageError,
  r2Config,
  r2StorageLayer,
} from './r2-storage.ts'

const key = '_mons/smoke/r2-storage.txt'
const expected = 'mons-r2-smoke-v1'
const expectedBytes = new TextEncoder().encode(expected)

const verifyR2 = Effect.fn('verifyR2')(function* () {
  const storage = yield* R2Storage
  const roundTrip = Effect.gen(function* () {
    yield* storage.putObject({ body: expectedBytes, contentType: 'text/plain', key })
    const object = yield* storage.getObject(key)
    const actual = new TextDecoder().decode(object.body)
    if (actual !== expected) {
      return yield* R2StorageError.make({
        cause: new Error('R2 returned different bytes than were uploaded'),
        key,
        operation: 'verifyObject',
      })
    }
    return object.body.byteLength
  })

  const bytes = yield* roundTrip.pipe(Effect.ensuring(storage.deleteObject(key).pipe(Effect.orDie)))
  const cleanupResult = yield* storage.getObject(key).pipe(Effect.flip)
  if (!(cleanupResult instanceof R2ObjectNotFound)) return yield* cleanupResult

  yield* Effect.logInfo('R2 smoke test passed and cleanup verified', {
    bucket: storage.bucket,
    bytes,
    key,
  })
})

const program = Effect.gen(function* () {
  const config = yield* r2Config
  return yield* verifyR2().pipe(Effect.provide(r2StorageLayer(config)))
})

NodeRuntime.runMain(program)
