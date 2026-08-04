import { sql, type Kysely } from 'kysely'

export async function up(database: Kysely<unknown>): Promise<void> {
  const builder = database.schema
  await builder
    .alterTable('profiles')
    .alterColumn('profile_id', (column) => column.setDefault(sql`gen_random_uuid()`))
    .execute()
  await builder
    .alterTable('profiles')
    .addColumn('clerk_user_id', 'text', (column) => column.ifNotExists())
    .execute()
  await builder
    .createIndex('profiles_clerk_user_id_unique')
    .unique()
    .ifNotExists()
    .on('profiles')
    .column('clerk_user_id')
    .execute()
}

export async function down(database: Kysely<unknown>): Promise<void> {
  const builder = database.schema
  await builder.dropIndex('profiles_clerk_user_id_unique').ifExists().execute()
  await builder.alterTable('profiles').dropColumn('clerk_user_id').execute()
}
