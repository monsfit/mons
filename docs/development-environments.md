# Development environments

Mons uses the remote development PostgreSQL database for every normal development flow. There is
no local PostgreSQL requirement and no runtime environment picker in the app.

## The four environments

| Use | API URL | PostgreSQL database | Application schema | Lifetime |
| --- | --- | --- | --- | --- |
| Personal Live | `https://<sst-stage>.api.dev.mons.fit` | `mons_dev` | Derived from the current feature branch | While `sst dev` is running |
| Branch Preview | `https://<branch-id>.api.dev.mons.fit` | `mons_dev` | The same schema as Personal Live | Until the branch is deleted |
| Shared Dev | `https://api.dev.mons.fit` | `mons_dev` | `mons_app` | Permanent |
| Production | `https://api.mons.fit` | `mons_prod` | `mons_app` | Permanent |

The catalog is shared inside each database as `mons_catalog`. Only application data is isolated by
branch. The branch identifier is deterministic, capped to fit PostgreSQL's identifier limit, and
used consistently for its schema, preview stage, hostname, and `preview/<branch-id>` R2 prefix.

## Ordinary development

Put the direct development migration-role URL in the ignored root `.env.local`:

```dotenv
MIGRATION_DATABASE_URL=postgresql://mons_dev_migration:...@<VPS_MAGICDNS_NAME>:5433/mons_dev?sslmode=require
MONS_DATABASE_RUNTIME_USER=mons_dev_app
```

Then run either command from the repository root:

```bash
sst dev
# or
pnpm dev
```

That is the entire startup flow. SST determines your saved personal stage (for example, `jeremy`),
derives the branch schema, runs the Effect SQL migrator automatically, and starts Live at
`https://jeremy.api.dev.mons.fit`. Edit an uncommitted migration as often as necessary while it is
only in your isolated branch schema. If the migration history needs to be replayed from scratch:

```bash
pnpm db:branch:reset
```

The reset command derives the current branch itself and refuses `main`, `dev`, `production`, or a
detached checkout. It cannot accept an arbitrary schema name. `pnpm db:branch:drop` applies the same
guard and removes an abandoned branch schema.

Once a migration is merged into `dev`, treat the migration file as immutable. Fixes after that point
are new forward migrations. The canonical deploy workflows always migrate before deploying the
Worker, and the runtime database role cannot perform DDL.

## Testing on an iPhone

Select one of the shared Xcode schemes before building:

- `Mons Live` embeds the personal Live URL. It is the fastest edit/test loop and works on a physical
  phone while `sst dev` is running. Because Live forwards development execution, it is not the mode
  to use after shutting the laptop.
- `Mons Preview` embeds the current branch preview URL. Push the branch first; GitHub deploys the
  complete Worker and migrates the same branch schema. The installed app then works with the laptop
  completely off.
- `Mons Dev` embeds the fixed shared development URL. Use it to test what has already reached `dev`.
- `Mons Prod` embeds the fixed production URL and uses the Release build configuration.

There is no dynamic URL check. Each scheme selects a build configuration, and a normal Xcode build
phase writes a tiny environment plist into the app bundle. That URL remains embedded in the
installed application.

## Push and cleanup flow

Every push to a non-`main`, non-`dev` branch runs the branch preview workflow:

1. Run the repository checks.
2. Join the private database network through Tailscale workload identity federation.
3. Apply all Effect SQL migrations to the deterministic branch schema.
4. Deploy the Cloudflare Worker at the deterministic preview hostname.
5. Verify `/health` through the public hostname.

Pushing `dev` migrates and deploys Shared Dev. Pushing `main` migrates and deploys Production. These
jobs use GitHub environments named `preview`, `dev`, and `production`, so their database URLs and
Cloudflare credentials remain distinct even though the secret keys have the same names.

Deleting a feature branch removes the Worker and route, deletes only its guarded R2 prefix, and
drops only its derived PostgreSQL schema. Canonical schemas and prefixes are rejected by the cleanup
commands.

## One-time GitHub setup

Create the `preview`, `dev`, and `production` GitHub environments. Configure these secrets in each
environment as appropriate:

```text
MIGRATION_DATABASE_URL
MONS_DATABASE_RUNTIME_USER
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

Use the development migration URL on port `5433` for `preview` and `dev`. Use the production
migration URL on the Tailscale-only port `5434` for `production`:

```text
preview/dev: postgresql://mons_dev_migration:...@<VPS_MAGICDNS_NAME>:5433/mons_dev?sslmode=require
production:  postgresql://mons_prod_migration:...@<VPS_MAGICDNS_NAME>:5434/mons_prod?sslmode=require
```

The `preview` environment also needs `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` scoped to the
`mons` bucket for branch cleanup. Add `TS_OAUTH_CLIENT_ID` and `TS_AUDIENCE` as repository secrets;
the Tailscale identity must be allowed to request `tag:ci` and reach `tag:database` only on these
PostgreSQL ports.
Protect the `production` environment with required approval.

Finally, configure the Clerk secret as an SST fallback secret so new personal and preview stages do
not need their own copy:

```bash
sst secret set ClerkSecretKey <value> --fallback
```
