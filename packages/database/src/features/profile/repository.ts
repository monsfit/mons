import { Context, Effect, Layer, Schema } from 'effect'
import { SqlClient } from 'effect/unstable/sql'

import { type RepositoryError, decodeRequiredRow } from '../../core/repository.ts'
import { validateSchemaName } from '../../migrations.ts'

export interface ProfileRepositoryService {
  readonly ensure: (profileId: string) => Effect.Effect<void, RepositoryError>
  readonly ensureForClerkUser: (clerkUserId: string) => Effect.Effect<string, RepositoryError>
  readonly belongsToClerkUser: (
    profileId: string,
    clerkUserId: string,
  ) => Effect.Effect<boolean, RepositoryError>
}

export const ProfileRepository = Context.Service<ProfileRepositoryService>(
  '@regolith/database/ProfileRepository',
)

export const makeProfileRepository = (
  options: { readonly appSchema?: string; readonly now?: () => Date } = {},
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const appSchema = yield* validateSchemaName(options.appSchema ?? 'regolith_app')
    const now = options.now ?? (() => new Date())
    const profiles = sql(`${appSchema}.profiles`)

    const ensureForClerkUser = Effect.fn('ProfileRepository.ensureForClerkUser')(function* (
      clerkUserId: string,
    ) {
      const rows = yield* sql`INSERT INTO ${profiles} (clerk_user_id)
        VALUES (${clerkUserId})
        ON CONFLICT (clerk_user_id) DO UPDATE SET updated_at = ${now()}
        RETURNING profile_id`
      const profile = yield* decodeRequiredRow(
        Schema.Struct({ profile_id: Schema.String }),
        rows,
        'Profile upsert returned no row',
      )
      return profile.profile_id
    })

    const ensure = Effect.fn('ProfileRepository.ensure')(function* (profileId: string) {
      yield* sql`INSERT INTO ${profiles} (profile_id, clerk_user_id)
        VALUES (${profileId}, NULL)
        ON CONFLICT (profile_id) DO UPDATE SET updated_at = ${now()}`
    })

    const belongsToClerkUser = Effect.fn('ProfileRepository.belongsToClerkUser')(function* (
      profileId: string,
      clerkUserId: string,
    ) {
      const rows = yield* sql`SELECT profile_id FROM ${profiles}
        WHERE profile_id = ${profileId} AND clerk_user_id = ${clerkUserId} LIMIT 1`
      return rows.length > 0
    })

    return ProfileRepository.of({ belongsToClerkUser, ensure, ensureForClerkUser })
  })

export const profileRepositoryLayer = (
  options: { readonly appSchema?: string; readonly now?: () => Date } = {},
) => Layer.effect(ProfileRepository, makeProfileRepository(options))
