import { Data, Effect, Schema } from 'effect'
import { SqlError } from 'effect/unstable/sql'

export class RepositoryInvariantError extends Data.TaggedError('RepositoryInvariantError')<{
  readonly message: string
}> {}

export class RepositoryOwnershipError extends Data.TaggedError('RepositoryOwnershipError')<{
  readonly message: string
}> {}

export type RepositoryError =
  | SqlError.SqlError
  | Schema.SchemaError
  | RepositoryInvariantError
  | RepositoryOwnershipError

export const decodeRows = <S extends Schema.Constraint>(schema: S, rows: ReadonlyArray<unknown>) =>
  Schema.decodeUnknownEffect(Schema.Array(schema))(rows)

export const decodeRequiredRow = <S extends Schema.Constraint>(
  schema: S,
  rows: ReadonlyArray<unknown>,
  message: string,
) =>
  Effect.gen(function* () {
    const decoded = yield* decodeRows(schema, rows)
    const value = decoded[0]
    if (value === undefined) return yield* new RepositoryInvariantError({ message })
    return value
  })
