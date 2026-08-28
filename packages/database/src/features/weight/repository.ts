import { Context, Effect, Layer, Schema } from 'effect'
import { SqlClient } from 'effect/unstable/sql'

import { type RepositoryError, decodeRequiredRow, decodeRows } from '../../core/repository.ts'
import { validateSchemaName } from '../../migrations.ts'

const weightLogEntryRecordSchema = Schema.Struct({
  created_at: Schema.Date,
  entry_id: Schema.String,
  measured_at: Schema.Date,
  profile_id: Schema.String,
  updated_at: Schema.Date,
  weight_kg: Schema.Number,
})

export type WeightLogEntryRecord = typeof weightLogEntryRecordSchema.Type

export interface SaveWeightLogEntryInput {
  readonly entryId: string
  readonly measuredAt: Date
  readonly weightKg: number
}

export interface WeightRepositoryService {
  readonly delete: (profileId: string, entryId: string) => Effect.Effect<boolean, RepositoryError>
  readonly list: (
    profileId: string,
    from: Date,
    to: Date,
  ) => Effect.Effect<ReadonlyArray<WeightLogEntryRecord>, RepositoryError>
  readonly save: (
    profileId: string,
    input: SaveWeightLogEntryInput,
  ) => Effect.Effect<WeightLogEntryRecord, RepositoryError>
}

export const WeightRepository = Context.Service<WeightRepositoryService>(
  '@mons/database/WeightRepository',
)

export const makeWeightRepository = (
  options: { readonly appSchema?: string; readonly now?: () => Date } = {},
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const appSchema = yield* validateSchemaName(options.appSchema ?? 'mons_app')
    const now = options.now ?? (() => new Date())
    const profiles = sql(`${appSchema}.profiles`)
    const weightLogEntries = sql(`${appSchema}.weight_log_entries`)

    const list = Effect.fn('WeightRepository.list')(function* (
      profileId: string,
      from: Date,
      to: Date,
    ) {
      const rows = yield* sql`SELECT * FROM ${weightLogEntries}
        WHERE profile_id = ${profileId} AND measured_at >= ${from} AND measured_at < ${to}
        ORDER BY measured_at ASC, entry_id ASC`
      return yield* decodeRows(weightLogEntryRecordSchema, rows)
    })

    const save = Effect.fn('WeightRepository.save')(function* (
      profileId: string,
      input: SaveWeightLogEntryInput,
    ) {
      return yield* sql.withTransaction(
        Effect.gen(function* () {
          yield* sql`INSERT INTO ${profiles} (profile_id, clerk_user_id)
            VALUES (${profileId}, NULL)
            ON CONFLICT (profile_id) DO UPDATE SET updated_at = ${now()}`
          const rows = yield* sql`INSERT INTO ${weightLogEntries}
              (entry_id, profile_id, measured_at, weight_kg)
            VALUES (${input.entryId}, ${profileId}, ${input.measuredAt}, ${input.weightKg})
            ON CONFLICT (entry_id) DO UPDATE SET
              measured_at = ${input.measuredAt}, weight_kg = ${input.weightKg}, updated_at = ${now()}
            RETURNING *`
          return yield* decodeRequiredRow(
            weightLogEntryRecordSchema,
            rows,
            'Weight log upsert returned no row',
          )
        }),
      )
    })

    const deleteEntry = Effect.fn('WeightRepository.delete')(function* (
      profileId: string,
      entryId: string,
    ) {
      const rows = yield* sql`DELETE FROM ${weightLogEntries}
        WHERE profile_id = ${profileId} AND entry_id = ${entryId} RETURNING entry_id`
      return rows.length > 0
    })

    return WeightRepository.of({ delete: deleteEntry, list, save })
  })

export const weightRepositoryLayer = (
  options: { readonly appSchema?: string; readonly now?: () => Date } = {},
) => Layer.effect(WeightRepository, makeWeightRepository(options))
