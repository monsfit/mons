# Contributing to Mons

Thanks for helping improve Mons. Bug fixes, accessibility improvements, API contract changes,
tests, documentation, and focused product enhancements are welcome.

## Development

Install Node.js 24 and pnpm 11.20.0, then run:

```bash
pnpm install
pnpm check
```

iOS changes must also pass:

```bash
npx pnpm@11.20.0 mons:check
```

Database integration tests require a disposable PostgreSQL database through
`MONS_TEST_DATABASE_URL`. Contributors who need catalog data can install the synthetic fixture:

```bash
MONS_CATALOG_SCHEMA=mons_catalog_sample pnpm db:catalog:seed
```

The installer refuses to replace a schema unless its name ends in `_sample` or `_test`.

## Pull requests

- Keep changes focused and explain the user-visible behavior.
- Add tests for public contracts, authorization, calculations, transactions, or regressions.
- Regenerate checked-in artifacts such as OpenAPI when their source declarations change.
- Never include credentials, production data, user data, or source dataset snapshots.

The production catalog ingestion pipeline is maintained outside this repository. Changes to the
public `CatalogReader` contract should include the corresponding fixture and compatibility notes so
the pipeline can be updated independently.

Unless explicitly stated otherwise, contributions intentionally submitted to this project are
licensed under Apache-2.0 as described in [LICENSE](LICENSE).
