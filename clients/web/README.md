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
