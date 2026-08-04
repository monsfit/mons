# Database

This package contains the Kysely types, PostgreSQL client factory, and read-only catalog
repository used by the API. Titan owns schema creation and ingestion; this package owns
application queries.

The repository supports:

- active snapshot status and dataset counts;
- exact branded-food lookup by normalized GTIN;
- ranked food-name search with an optional raw/branded filter.

Run its PostgreSQL integration tests from the repository root:

```bash
npx pnpm@11.20.0 db:up
npx pnpm@11.20.0 test:database
```
