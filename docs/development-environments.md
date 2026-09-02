# Development environments

Mons has three remote environments: personal development, shared staging, and production. Each
uses its own PostgreSQL container, Hyperdrive configuration, application schema, nutrition
catalog, and media prefix. There is no local PostgreSQL requirement and no branch-preview
infrastructure.

## Environment routing

| Use           | API URL                                | Database        | Schema     | Media prefix       |
| ------------- | -------------------------------------- | --------------- | ---------- | ------------------ |
| Personal Live | `https://<sst-stage>.api.dev.mons.fit` | `mons_personal` | `mons_app` | `live/<sst-stage>` |
| Staging       | `https://api.dev.mons.fit`             | `mons_dev`      | `mons_app` | `dev`              |
| Production    | `https://api.mons.fit`                 | `mons_prod`     | `mons_app` | `production`       |

Personal Live is the ordinary development loop. Staging is the durable environment deployed from
the `dev` branch, and Production is deployed from `main`. Feature branches do not create Workers,
schemas, or media namespaces.

## Ordinary development

Put the personal migration-role URL and personal Hyperdrive ID in the ignored root `.env`:

```dotenv
MIGRATION_DATABASE_URL=postgresql://mons_personal_migration:...@<VPS_MAGICDNS_NAME>:5432/mons_personal?uselibpqcompat=true&sslmode=require
MONS_DATABASE_RUNTIME_USER=mons_personal_app
MONS_PERSONAL_HYPERDRIVE_ID=<personal-hyperdrive-id>
```

Then run `pnpm dev`. SST uses your saved stage (for example, `jeremy`), links the personal
Hyperdrive, migrates `mons_app`, and starts Live at `https://jeremy.api.dev.mons.fit`. Personal data
persists across branches and development sessions. Migration files can be edited while they are
still personal; after a migration reaches staging, fix it with a new forward migration.

To test the durable shared environment, merge or push to `dev`. The deployment workflow migrates
`mons_dev` before deploying the Worker. Pushing `main` does the same for Production. The runtime
roles cannot perform DDL.

## Testing on an iPhone

Select one of the shared Xcode schemes:

- `Mons Live` embeds the personal Live URL and works while `sst dev` is running.
- `Mons Dev` embeds the durable staging URL and works with the laptop off.
- `Mons Prod` embeds the production URL and uses a Release build.

The selected URL is written into the app bundle at build time; there is no runtime environment
switch.

## GitHub setup

Create `dev` and `production` GitHub environments for canonical API deployments. Configure the
appropriate values in each environment:

```text
MIGRATION_DATABASE_URL
MONS_DATABASE_RUNTIME_USER
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

Use the staging migration URL on port `5433` and production on `5434`:

```text
dev:        postgresql://mons_dev_migration:...@<VPS_MAGICDNS_NAME>:5433/mons_dev?uselibpqcompat=true&sslmode=require
production: postgresql://mons_prod_migration:...@<VPS_MAGICDNS_NAME>:5434/mons_prod?uselibpqcompat=true&sslmode=require
```

The deployment job also uses `TS_OAUTH_CLIENT_ID` and `TS_AUDIENCE` repository secrets to reach
PostgreSQL over Tailscale. The workload identity subject is:

```text
repo:monsfit@321544628/mons@1166968122:environment:*
```

Allow `tag:ci` to reach `tag:database` only on the three PostgreSQL ports, and protect the
`production` environment with required approval.

Catalog construction and promotion are owned by the private `monsfit/mons-data` repository. That
repository has its own `personal`, `dev`, and `production` environments and R2 credentials; do not
add ingestion credentials or source artifacts to this public repository.

Configure Clerk as an SST fallback secret so the personal, staging, and production stages share
the intended development instance unless explicitly overridden:

```bash
sst secret set ClerkSecretKey <value> --fallback
```
