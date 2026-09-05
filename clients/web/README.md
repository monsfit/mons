# Mons web

The Mons web client is a server-rendered TanStack Start application running on Cloudflare Workers.
It serves the public website and shared web tools, beginning with the catalog workspace at
`/foods`. The workspace searches the normalized raw, branded, and restaurant catalog directly from
PostgreSQL through Hyperdrive.

The interface uses Tailwind CSS and shadcn's React Aria component base. It is intentionally
unauthenticated for now.

## Run locally

Start the repository's PostgreSQL container, then run the web client:

```bash
pnpm dev:database
pnpm db:migrate
pnpm dev:web
```

Wrangler reads the ignored `clients/web/.env` file. Copy `.env.example` to `.env` if it does not
exist; its binding-specific local Hyperdrive variable points at the local `mons` database. Open
<http://localhost:3001/foods>. The API continues to use port 3000.

## Data path

```text
TanStack Start server function
  -> Effect CatalogReader
  -> Wrangler local Hyperdrive binding
  -> local PostgreSQL mons_catalog schema
```

Search and filters are encoded in the URL. Food groups, brands, dataset counts, food results, and
the active catalog release are all read from the database; no catalog fixture is bundled into the
web client.

Food, brand, and restaurant searches update after 300 ms without typing; Enter submits immediately.
Food searches need at least two characters. Clearing the input clears the query and results while
preserving filters; a single character waits for more input. Brand/restaurant text narrows the
corresponding picker; selecting a result applies that filter.
Changes replace the current URL entry, preserve focus, and reset table pagination. The table loads
50 rows at a time near the bottom, with a manual load/retry button and an explicit end state.

Run the browser interaction regression against a running local web server and populated local
catalog with `pnpm --filter @mons/web test:e2e` (Google Chrome required). It checks debouncing,
filter combinations, scroll loading, duplicate rows, sticky headers, and empty results. Unit tests
cover delayed responses, input composition, request invalidation, and retries. No catalog reload is
performed by these web tests. Database integration tests use isolated test schemas.

## Commands

```bash
pnpm --filter @mons/web lint
pnpm --filter @mons/web typecheck
pnpm --filter @mons/web test
pnpm --filter @mons/web build
pnpm --filter @mons/web types:generate
pnpm deploy:web:dev
pnpm deploy:web:production
```

The `dev` deployment uses the existing development Hyperdrive at `dev.mons.fit`. The production
environment uses the production Hyperdrive at `mons.fit`.
