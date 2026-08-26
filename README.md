# Mons

Mons is a food-data and fitness application maintained as a polyglot monorepo.

```text
source datasets
      │
      ▼
Nutrition ingest (Python) ──► versioned JSONL + manifests ──► PostgreSQL
      │                                               │
      └──► generated JSON Schemas                     ▼
                                           Effect API (TypeScript)
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
  contracts/           Effect Schema API contracts and generated food JSON Schemas
  database/            Effect SQL migrations and repositories
services/
  api/                 TypeScript HTTP API and generated OpenAPI document
  nutrition-ingest/    Python normalization and PostgreSQL ingestion library
data/                   Local inputs and generated snapshots; intentionally ignored
```

See [the API guide](services/api/README.md), [the marketing guide](clients/web/README.md),
[the nutrition-ingest guide](services/nutrition-ingest/README.md), and
[data-source policy](services/nutrition-ingest/DATA_SOURCES.md)
for component-specific details.

## Requirements

- Node.js 24 or newer
- Docker Desktop
- Python 3.11 or newer and `uv`
- Xcode 26 for the Mons app

The workspace pins pnpm, TypeScript 7 native preview, Turborepo, Oxfmt, Oxlint, Effect,
Effect SQL, and Vitest in `pnpm-workspace.yaml` and `pnpm-lock.yaml`.

## Quick start

Run commands from the repository root:

```bash
nvm use
pnpm install
uv sync --project services/nutrition-ingest --all-extras
npx clerk@latest env pull --app app_2ydgnHRPQ7JmVCswcMHsCCx0PMZ --instance dev --file .env
pnpm db:migrate
pnpm db:status
pnpm dev
```

The API starts at <http://localhost:3000>. OpenAPI JSON is served at `/openapi.json`, and
interactive API documentation is served at `/docs`.

Run `pnpm dev:marketing` in a second terminal to start the marketing website at
<http://localhost:3001>.

The pnpm prepare lifecycle clones the exact Effect 4 source tag used by the workspace into
ignored `.repos/effect`. `scripts/prepare-effect.sh` verifies the pinned commit, giving contributors
a reproducible local reference without vendoring framework source into this repository.

The Clerk CLI command writes the development publishable and secret keys to the ignored `.env`
file. Never commit that file.

The VPS owns the PostgreSQL containers, Cloudflare Tunnel connector, and backups. Their
version-controlled configuration lives under `infra/vps`; these commands are intended to run from
a checkout on that host. Application traffic follows Worker → Hyperdrive → VPC Service → Tunnel →
PostgreSQL. A separate operator path exposes development PostgreSQL only on the VPS Tailscale
address for migrations, ingestion, tests, and the standalone local API. Production has no
host-published port.

```bash
pnpm vps:provision
pnpm vps:up
```

On the VPS, retrieve the development application password without printing any other secret:

```bash
sudo cat /etc/regolith/postgres/dev/app-password
```

Put that value into the ignored `.env` using the URL shape in `.env.example`.

Cloudflare connectivity uses the shared `regolith-postgres` Tunnel. The
`mons-postgres-dev` and `mons-postgres-prod` Workers VPC services resolve the corresponding
Docker-internal hostnames and enforce `verify_full` against their Cloudflare Origin CA
certificates. Hyperdrive configurations `mons-development` and `mons-production` use the
environment-specific application roles. `pnpm vps:up` starts the connector alongside PostgreSQL.

The private `mons-postgres-backups` R2 bucket is reserved for production pgBackRest backups.
Production continuously archives completed WAL segments to R2, and pgBackRest retains four full
backup sets and their required WAL. Schedule the single backup command weekly on the VPS:

```bash
pnpm vps:backup
```

Run a disposable point-in-time restore verification with `pnpm vps:restore-drill`. See
`infra/vps/README.md` for the full host runbook.

VPS monitoring runs separately from the application database stack:

- Node Exporter reports host CPU, memory, disk, and network usage.
- cAdvisor reports resource usage for Docker containers, including PostgreSQL.
- Prometheus stores at most 30 days or 15 GB of metrics.
- Grafana displays the provisioned VPS dashboard.

Prometheus and both exporters remain on a private Docker network. Grafana is the only published
port and is reachable through Tailscale at `http://100.71.253.62:3000`.

Create the Grafana administrator password once, then start the stack:

```bash
pnpm monitoring:provision
pnpm monitoring:up
```

Retrieve the initial Grafana password on the VPS with
`sudo cat /etc/regolith/monitoring/grafana-admin-password`. Change it after the first login. The
Prometheus datasource and VPS dashboard are provisioned from `infra/vps/monitoring`. This first version
does not connect to PostgreSQL or add database users. Add database-level metrics only if container
and host metrics prove insufficient. Alerts are also deferred until there is a real notification
destination.

Migrations run as the environment's migration role before an API deployment; the API runtime role
cannot create schemas or tables, and API startup never applies migrations. CI applies every
migration twice against PostgreSQL 18 to verify both forward execution and idempotency. Production
uses `pnpm deploy:production` only after its migration job succeeds.

SST provisions the stage-specific Cloudflare AI Gateway and links the existing `mons` R2 bucket as
the native `Media` binding. Deployed Workers therefore need neither an AI provider token nor R2
access keys. The S3-compatible R2 variables in `.env.example` are optional and apply only when the
standalone Node server needs remote media access during local development.

## Common commands

| Command                           | Purpose                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm dev`            | Run the API in watch mode through the Oxc TypeScript runner                  |
| `pnpm dev:marketing`  | Run the TanStack Start marketing website on port 3001                        |
| `pnpm db:status`      | Inspect the active PostgreSQL snapshot                                       |
| `pnpm db:migrate`     | Migrate stable app tables and catalog full-text search                       |
| `pnpm monitoring:up`  | Start the private VPS monitoring stack                                       |
| `pnpm monitoring:logs`| Follow logs for Prometheus, Grafana, and all exporters                       |
| `pnpm db:ingest`      | Atomically ingest the schema-v2 raw and branded snapshots                    |
| `pnpm vps:backup`     | Create a full production backup from the VPS                                 |
| `pnpm contracts`      | Regenerate raw and branded JSON Schemas                                      |
| `pnpm openapi`        | Regenerate the OpenAPI document                                              |
| `pnpm mons:test`      | Build and test the Mons Xcode project on macOS                               |
| `pnpm mons:build:ios` | Compile the iOS app and barcode scanner path                                 |
| `pnpm verify`         | Run every local formatting, build, test, contract, database, and Xcode check |

`db:ingest` expects the manifest-backed files under `data/outputs/v2`. The nutrition-ingest service verifies their
schema versions and SHA-256 hashes before loading them.

## Development guarantees

- Dependency versions are exact and resolved by one pnpm lockfile.
- HTTP routes, OpenAPI, request validation, errors, layers, logging, and PostgreSQL access use
  Effect 4 modules end to end; the generated contract and runtime share one declaration.
- Nutrition ingest emits stable JSONL bytes and records hashes, row counts, source hashes, rejection
  details, and field coverage in sidecar manifests.
- PostgreSQL ingestion uses staging schemas and an atomic schema swap.
- Raw and branded foods share one schema while remaining separate table partitions.
- USDA branded records win valid GTIN duplicates before Open Food Facts records are considered.
- Branded snapshots require valid product identity and complete, bounded core nutrition per 100 g.
- Catalog names and brands use weighted PostgreSQL full-text search with trigram fallback and
  a defensive quality predicate.
- Catalog search and barcode responses include every available normalized nutrient and household
  gram portion, while preserving raw and branded provenance.
- Profiles, food logs, custom foods, measured-yield recipes, weight history, workout templates, and completed workouts live in
  `regolith_app`, outside replaceable catalog snapshots.
- Clerk session tokens authenticate every `/v1` request. A unique `clerk_user_id` maps each Clerk
  account to a database-generated internal profile UUID, and profile routes verify ownership.
- Adult onboarding inputs and the resulting nutrition plan live in `regolith_app`; the API
  calculates RMR, TDEE, goal velocity, and the daily calorie target on the server.
- Food logs snapshot nutrients per 100 g so historical totals survive catalog refreshes.
- JSON Schema and OpenAPI artifacts are generated deterministically and checked in CI.
- CI independently verifies TypeScript, Python 3.11–3.13, PostgreSQL, and Mons.

The former standalone Mons repository history is retained locally under
`.history/mons.git` and is intentionally excluded from the monorepo working tree.

## Data licensing

Apache-2.0 covers the software only. Input datasets and derived datasets retain their
providers' terms and must not be published until the review gate in
[DATA_SOURCES.md](services/nutrition-ingest/DATA_SOURCES.md) is complete.
