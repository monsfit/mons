import { NodeFileSystem, NodeRuntime } from '@effect/platform-node'
import { Effect, FileSystem } from 'effect'
import { OpenApi } from 'effect/unstable/httpapi'
import { fileURLToPath } from 'node:url'

import { MonsApi } from './api.ts'

const outputDirectory = fileURLToPath(new URL('../openapi/', import.meta.url))
const outputPath = fileURLToPath(new URL('../openapi/openapi.json', import.meta.url))
const payload = `${JSON.stringify(OpenApi.fromApi(MonsApi), null, 2)}\n`
const check = process.argv.includes('--check')

const program = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem
  if (check) {
    const existing = yield* fileSystem
      .readFileString(outputPath)
      .pipe(Effect.catch(() => Effect.succeed(undefined)))
    if (existing !== payload) {
      return yield* Effect.fail(new Error('Generated OpenAPI document is stale; run pnpm openapi'))
    }
    return
  }
  yield* fileSystem.makeDirectory(outputDirectory, { recursive: true })
  yield* fileSystem.writeFileString(outputPath, payload)
}).pipe(Effect.provide(NodeFileSystem.layer))

NodeRuntime.runMain(program)
