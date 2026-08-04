# Regolith

Regolith is a food-data and fitness application maintained as a polyglot monorepo.

```text
source datasets
      │
      ▼
Titan (Python) ──► versioned JSONL + manifests ──► PostgreSQL
      │                                               │
      └──► generated JSON Schemas                     ▼
                                            Hono API (TypeScript)
                                                      │
                                                      ▼
                                               Mons (SwiftUI)
```

## Repository layout

```text
apps/
  api/                 TypeScript HTTP API and generated OpenAPI document
  mons/                SwiftUI application and Xcode tests
packages/
  contracts/           Valibot API contracts and generated food JSON Schemas
  database/            Kysely database types and catalog repository
services/
  titan/               Python normalization and PostgreSQL ingestion library
data/                   Local inputs and generated snapshots; intentionally ignored
```

See [the API guide](apps/api/README.md), [the Titan guide](services/titan/README.md), and
[data-source policy](services/titan/DATA_SOURCES.md) for component-specific details.

## Requirements

- Node.js 24 or newer
- Docker Desktop
- Python 3.11 or newer and `uv`
- Xcode 26 for the Mons app

The workspace pins pnpm, TypeScript 7 native preview, Turborepo, Oxfmt, Oxlint, Hono,
Kysely, and Vitest in `pnpm-workspace.yaml` and `pnpm-lock.yaml`.

## Quick start

Run commands from the repository root:

```bash
npx pnpm@11.20.0 install
uv sync --project services/titan --all-extras
npx pnpm@11.20.0 db:up
npx pnpm@11.20.0 db:migrate
npx pnpm@11.20.0 db:status
npx pnpm@11.20.0 dev
```

The API starts at <http://localhost:3000>. OpenAPI JSON is served at `/openapi.json`, and
interactive API documentation is served at `/docs`.

Copy `.env.example` to `.env` only when overriding the local defaults. PostgreSQL data is
kept in the `regolith-postgres` Docker volume between container restarts.

## Common commands

| Command | Purpose |
|---|---|
| `npx pnpm@11.20.0 dev` | Run the API in watch mode through the Oxc TypeScript runner |
| `npx pnpm@11.20.0 db:status` | Inspect the active PostgreSQL snapshot |
| `npx pnpm@11.20.0 db:migrate` | Migrate stable app tables and catalog full-text search |
| `npx pnpm@11.20.0 db:ingest` | Atomically ingest the schema-v2 raw and branded snapshots |
| `npx pnpm@11.20.0 contracts` | Regenerate raw and branded JSON Schemas |
| `npx pnpm@11.20.0 openapi` | Regenerate the OpenAPI document |
| `npx pnpm@11.20.0 mons:test` | Build and test the Mons Xcode project on macOS |
| `npx pnpm@11.20.0 mons:build:ios` | Compile the iOS app and barcode scanner path |
| `npx pnpm@11.20.0 verify` | Run every local formatting, build, test, contract, database, and Xcode check |

`db:ingest` expects the manifest-backed files under `data/outputs/v2`. Titan verifies their
schema versions and SHA-256 hashes before loading them.

## Development guarantees

- Dependency versions are exact and resolved by one pnpm lockfile.
- Titan emits stable JSONL bytes and records hashes, row counts, source hashes, rejection
  details, and field coverage in sidecar manifests.
- PostgreSQL ingestion uses staging schemas and an atomic schema swap.
- Raw and branded foods share one schema while remaining separate table partitions.
- USDA branded records win valid GTIN duplicates before Open Food Facts records are considered.
- Branded snapshots require valid product identity and complete, bounded core nutrition per 100 g.
- Catalog names and brands use weighted PostgreSQL full-text search with trigram fallback and
  a defensive quality predicate.
- Profiles, food logs, and workouts live in `regolith_app`, outside replaceable catalog snapshots.
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
[DATA_SOURCES.md](services/titan/DATA_SOURCES.md) is complete.
