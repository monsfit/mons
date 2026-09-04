# Development environments

Mons uses Cloudflare Wrangler directly for local development and Worker deployments. The `dev`
branch is the shared staging environment despite its historical name.

## Environments

| Use        | API URL                    | PostgreSQL database | Application schema | Lifetime             |
| ---------- | -------------------------- | ------------------- | ------------------ | -------------------- |
| Local      | `http://127.0.0.1:8787`    | Docker `mons`       | `mons_app`         | Developer controlled |
| Staging    | `https://api.dev.mons.fit` | `mons_dev`          | `mons_app`         | Permanent            |
| Production | `https://api.mons.fit`     | `mons_prod`         | `mons_app`         | Permanent            |

The catalog is shared inside each deployed database as `mons_catalog`. The `dev` branch deploys the
durable staging environment; `main` deploys production. Feature branches do not create remote
Workers, schemas, or media namespaces.

## Ordinary development

Pull the Clerk development keys into the ignored root `.env` once:

```bash
npx clerk@latest env pull --app app_2ydgnHRPQ7JmVCswcMHsCCx0PMZ --instance dev --file .dev.vars
pnpm exec wrangler login
```

Then run:

```bash
pnpm dev
```

The command starts PostgreSQL 18 from `infra/local/compose.yaml`, waits for it to become healthy,
applies the Effect SQL migrations, and launches `wrangler dev`. Wrangler runs the Worker in local
workerd, connects the `Database` Hyperdrive binding directly to PostgreSQL, uses local R2 state, and
keeps the Workers AI binding remote. Local Hyperdrive does not provide production pooling or
caching.

`DATABASE_URL` can override the Worker's direct connection and should use a restricted application
role. When pointing at an existing database, separately set `MIGRATION_DATABASE_URL` to its
migration role. Stop the local database without deleting its volume with:

```bash
pnpm dev:database:stop
```

Migration files merged into `dev` or `main` are immutable. Fixes after that point are new forward
migrations. Deployment workflows migrate with their privileged migration role before Wrangler
uploads the Worker; the runtime role cannot perform DDL.

## Testing on an iPhone

Select one of the shared Xcode schemes before building:

- `Mons Live` embeds `http://127.0.0.1:8787` by default for a simulator. For a physical phone, run
  `pnpm dev -- --tunnel`, then build with `MONS_API_URL=https://<quick-tunnel-host>`. The tunnel ends
  when Wrangler stops.
- `Mons Dev` embeds the fixed staging URL, `https://api.dev.mons.fit`.
- `Mons Prod` embeds the fixed production URL and uses the Release build configuration.

There is no dynamic environment picker. A normal Xcode build phase writes the selected URL into a
small environment plist in the app bundle.

## Deployment flow

Pushing `dev` runs checks, migrates `mons_dev`, deploys staging with Wrangler, and verifies
`/health`. Pushing `main` performs the same sequence for production. Feature branches run CI but do
not create Cloudflare or PostgreSQL resources.

`wrangler.jsonc` owns the stable Worker configuration. Hyperdrive, R2, AI Gateway, DNS, and database
resources already exist and are referenced by binding or ID; Wrangler does not recreate them.

## One-time GitHub setup

Create the `dev` and `production` GitHub environments. Configure these secrets in each:

```text
CLERK_SECRET_KEY
MIGRATION_DATABASE_URL
MONS_DATABASE_RUNTIME_USER
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

The Cloudflare token needs Worker Scripts, Worker Routes, and the permissions required to attach
the existing bindings. Use the staging migration URL on the Tailscale-only port `5433` for `dev`,
and the production migration URL on port `5434` for `production`:

```text
dev:        postgresql://mons_dev_migration:...@<VPS_MAGICDNS_NAME>:5433/mons_dev?uselibpqcompat=true&sslmode=require
production: postgresql://mons_prod_migration:...@<VPS_MAGICDNS_NAME>:5434/mons_prod?uselibpqcompat=true&sslmode=require
```

Add `TS_OAUTH_CLIENT_ID` and `TS_AUDIENCE` as repository secrets. Create the Tailscale workload
identity with this GitHub issuer subject:

```text
repo:monsfit@321544628/mons@1166968122:environment:*
```

Give it Auth keys write access for `tag:ci`. Tailnet policy should allow `tag:ci` to reach
`tag:database` only on the PostgreSQL ports above. Protect the `production` environment with
required approval.

Before the first Wrangler deployment, copy the existing Clerk secret into `CLERK_SECRET_KEY` for
both GitHub environments. The previous SST fallback secret cannot be read back through GitHub.

Catalog construction and promotion are owned by the private `monsfit/mons-data` repository. That
repository has its own `dev` and `production` environments and R2 credentials; do not
add ingestion credentials or source artifacts to this public repository.
