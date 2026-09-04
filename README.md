# Mons

Mons is an open-source food and fitness application with SwiftUI clients, an Effect API, and a
public database contract. Mons operates its production food catalog through a separately maintained
data pipeline.

```text
Mons data pipeline ──► PostgreSQL catalog ──► Effect API (TypeScript)
                                                   │
                                   ┌───────────────┴──────────────┐
                                   ▼                              ▼
                            Mons (SwiftUI)           Marketing (TanStack Start)
```

## Repository layout

```text
clients/
  ios/                 SwiftUI application and Xcode tests
  web/                 TanStack Start marketing website
packages/
  contracts/           Effect Schema API contracts
  database/            Effect SQL migrations and repositories
services/
  api/                 TypeScript HTTP API and generated OpenAPI document
```

See [the API guide](services/api/README.md), [the marketing guide](clients/web/README.md), and the
[database guide](packages/database/README.md) for component-specific details.

## Requirements

- Node.js 24 or newer
- Docker
- Xcode 26 for the Mons app

The workspace pins pnpm, TypeScript 7 native preview, Turborepo, Oxfmt, Oxlint, Effect,
Effect SQL, and Vitest in `pnpm-workspace.yaml` and `pnpm-lock.yaml`.

## Quick start

Run commands from the repository root:

```bash
nvm use
pnpm install
npx clerk@latest env pull --app app_2ydgnHRPQ7JmVCswcMHsCCx0PMZ --instance dev --file .dev.vars
pnpm dev
```

`pnpm dev` starts PostgreSQL 18 in Docker, migrates it, and runs the Worker locally with Wrangler.
Hyperdrive connects straight to that local database, Workers AI remains a remote binding, and R2
uses Wrangler's local state. See [the development environment flow](docs/development-environments.md)
for iPhone tunnels, staging, production, and CI secrets.

Run `pnpm dev:marketing` in a second terminal to start the marketing website at
<http://localhost:3001>.

The pnpm prepare lifecycle clones the exact Effect 4 source tag used by the workspace into
ignored `.repos/effect`. `scripts/prepare-effect.sh` verifies the pinned commit, giving contributors
a reproducible local reference without vendoring framework source into this repository.

The Clerk CLI command writes the development publishable and secret keys to the ignored `.dev.vars`
file. Never commit that file.

The API reads the stable `mons_catalog` PostgreSQL contract and does not depend on the production
ingestion pipeline at build time. For development without an existing catalog, set
`MONS_CATALOG_SCHEMA=mons_catalog_sample` and run `pnpm db:catalog:seed`. The command only replaces
schemas ending in `_sample` or `_test`.

## Open-source boundary

This repository contains the Mons clients, HTTP API, shared contracts, application migrations,
catalog reader, infrastructure definitions, and deterministic development fixtures under
Apache-2.0. The source acquisition, normalization, deduplication, catalog release, and promotion
pipeline is maintained separately in the private `monsfit/mons-data` repository. Production
datasets, user data, credentials, and operational state are never part of this repository.

The public API contract is generated into `services/api/openapi/openapi.json`. A compatible catalog
implementation needs only to satisfy the read-side PostgreSQL contract exercised by
`packages/database/src/catalog-fixture.ts` and the database integration tests.

The VPS owns the PostgreSQL containers, Cloudflare Tunnel connector, and backups. Their
version-controlled configuration lives under `infra/vps`; these commands are intended to run from
a checkout on that host. Application traffic follows Worker → Hyperdrive → VPC Service → Tunnel →
PostgreSQL. A separate operator path exposes localhost-bound PostgreSQL through Tailscale Serve and
the VPS's private MagicDNS name: development uses port `5433`, and production uses port `5434` for
deployment migrations. Tailscale policy should restrict production access to CI and operators.

```bash
pnpm vps:provision
pnpm vps:up
```

For operator access to the staging database, retrieve its application password on the VPS without
printing any other secret:

```bash
sudo cat /etc/mons/postgres/dev/app-password
```

Use that value only for explicit staging operations; ordinary development uses the local database.

Cloudflare connectivity uses the shared `mons-postgres` Tunnel. The
`mons-postgres-dev` and `mons-postgres-prod` Workers VPC services resolve the corresponding
Docker-internal hostnames and enforce `verify_full` against their Cloudflare Origin CA
certificates. Hyperdrive configurations `mons-development` and `mons-production` use the
environment-specific application roles. `pnpm vps:up` starts the connector alongside PostgreSQL.

The private `mons-postgres-backups` R2 bucket is reserved for production pgBackRest backups.
Production continuously archives completed WAL segments to R2, and pgBackRest retains four full
backup sets and their required WAL. Schedule the single backup command weekly on the VPS:

```bash
pnpm vps:backup
pnpm vps:backup:install-timers
```

Run a disposable point-in-time restore verification with `pnpm vps:restore-drill`. See
`infra/vps/README.md` for the full host runbook.

VPS monitoring runs separately from the application database stack:

- Node Exporter reports host CPU, memory, disk, and network usage.
- cAdvisor reports resource usage for Docker containers, including PostgreSQL.
- PostgreSQL exporters report connections, transactions, cache behavior, locks, and database size
  using dedicated `pg_monitor` roles.
- Prometheus stores at most 30 days or 15 GB of metrics.
- Grafana displays the provisioned VPS dashboard.

Prometheus and both PostgreSQL exporters remain on a private Docker network. Grafana is reachable only through
Tailscale at `http://<VPS_MAGICDNS_NAME>:3000`.

Create the Grafana administrator password once, then start the stack:

```bash
pnpm monitoring:provision
pnpm monitoring:up
```

Retrieve the Grafana password on the VPS with
`sudo cat /etc/mons/monitoring/grafana-admin-password`. Treat that file as the canonical
password; if the persisted Grafana password drifts, reset it from the file using the host runbook.
The Prometheus datasource and dashboards are provisioned from `infra/vps/monitoring`. Alerts are
deferred until there is a real notification destination.

Migrations run as the environment's migration role before an API deployment; the API runtime role
cannot create schemas or tables, and API startup never applies migrations. CI applies every
migration twice against PostgreSQL 18 to verify both forward execution and idempotency. Production
uses `pnpm deploy:production` only after its migration job succeeds.

Wrangler deploys the Worker and binds the existing environment-specific Hyperdrive, AI Gateway,
Workers AI, and `mons` R2 bucket. Deployed Workers therefore need neither an AI provider token nor
R2 access keys. The S3-compatible R2 variables in `.env.example` are optional and apply only to
standalone Node tooling.

## Common commands

| Command                  | Purpose                                                                      |
| ------------------------ | ---------------------------------------------------------------------------- |
| `pnpm dev`               | Start local PostgreSQL, migrate it, and run the Worker with Wrangler         |
| `pnpm dev:database:stop` | Stop the local PostgreSQL container                                          |
| `pnpm dev:marketing`     | Run the TanStack Start marketing website on port 3001                        |
| `pnpm db:catalog:seed`   | Install the deterministic sample catalog into a safe local schema            |
| `pnpm db:migrate`        | Migrate stable application tables                                            |
| `pnpm monitoring:up`     | Start the private VPS monitoring stack                                       |
| `pnpm monitoring:logs`   | Follow logs for Prometheus, Grafana, and all exporters                       |
| `pnpm vps:backup`        | Create a full production backup from the VPS                                 |
| `pnpm openapi`           | Regenerate the OpenAPI document                                              |
| `pnpm mons:test`         | Build and test the Mons Xcode project on macOS                               |
| `pnpm mons:build:ios`    | Compile the iOS app and barcode scanner path                                 |
| `pnpm verify`            | Run every local formatting, build, test, contract, database, and Xcode check |

## Development guarantees

- Dependency versions are exact and resolved by one pnpm lockfile.
- HTTP routes, OpenAPI, request validation, errors, layers, logging, and PostgreSQL access use
  Effect 4 modules end to end; the generated contract and runtime share one declaration.
- The private data pipeline publishes a versioned catalog satisfying the public read contract.
- Raw and branded foods share one schema while remaining separate table partitions.
- Catalog names and brands use weighted PostgreSQL full-text search with trigram fallback and
  a defensive quality predicate.
- Catalog search and barcode responses include every available normalized nutrient and household
  gram portion, while preserving raw and branded provenance.
- Profiles, food logs, custom foods, measured-yield recipes, weight history, workout templates, and completed workouts live in
  `mons_app`, outside replaceable catalog snapshots.
- Clerk session tokens authenticate every `/v1` request. A unique `clerk_user_id` maps each Clerk
  account to a database-generated internal profile UUID, and profile routes verify ownership.
- Adult onboarding inputs and the resulting nutrition plan live in `mons_app`; the API
  calculates RMR, TDEE, goal velocity, and the daily calorie target on the server.
- Food logs snapshot nutrients per 100 g so historical totals survive catalog refreshes.
- OpenAPI artifacts are generated deterministically and checked in CI.
- CI verifies TypeScript, PostgreSQL, and infrastructure. iOS validation remains available through
  the local `pnpm mons:check` command.

The former standalone Mons repository history is retained locally under
`.history/mons.git` and is intentionally excluded from the monorepo working tree.

## Data licensing

Apache-2.0 covers this repository's software only. Catalog datasets retain their providers' terms
and are not distributed from this repository.
