# Database

This package contains Effect SQL PostgreSQL layers, ordered application migrations,
schema-decoded catalog queries, and application repositories used by the API. It owns the stable
`mons_app` schema. The separately maintained Mons data pipeline owns production `mons_catalog`
tables, indexes, loading, and runtime grants. This package owns their public read contract and a
deterministic sample implementation.

The repository supports:

- exact branded-food lookup by normalized GTIN, guarded by the catalog quality contract;
- weighted full-text food and brand search with trigram fallback and USDA-first branded ties;
- idempotent profile and food-log persistence with nutrient snapshots;
- one server-calculated nutrition plan per profile, including its source inputs and calculation
  timestamp;
- idempotent canonical-kilogram weight entries ordered by measurement time and UUID;
- atomic reusable workout-template hierarchy persistence;
- atomic completed-workout and ordered-set persistence.
- profile-owned custom foods with optional GTINs, household portions, and compressed image data;
- measured-yield recipes with ordered catalog/custom ingredients, freeform ingredients, deterministic
  per-100-gram nutrition, and explicit pending-estimate states;
- GIN full-text indexes for custom-food and recipe names alongside the catalog indexes.
- auditable meal estimates with model/prompt provenance and ordered, catalog-constrained food
  matches; calculated calories and macros are persisted separately from the model observations.

Application tables are intentionally separate from the `mons_catalog` catalog schema. The data
pipeline can atomically replace the catalog without deleting user history.

The reader defensively excludes incomplete or out-of-range nutrition records even if an older
snapshot is still loaded. Raw and branded searches can be requested separately so clients can
present stable Common and Branded sections. When a raw composition source reports available
carbohydrate but not total carbohydrate, the catalog reader exposes that source value as the
API's generic carbohydrate summary without changing the normalized source field.

Nutrition-plan calculation is a pure module with an injectable calculation date. PostgreSQL
stores both the onboarding inputs and calculated RMR, TDEE, calorie target, estimated duration,
and whether the 1,000 kcal/day minimum limited the requested rate. This makes later formula
changes auditable without trusting values submitted by a client.

Run its PostgreSQL integration tests from the repository root:

```bash
npx pnpm@11.20.0 db:migrate
npx pnpm@11.20.0 db:catalog:seed
npx pnpm@11.20.0 test:database
```

`db:catalog:seed` uses `MIGRATION_DATABASE_URL` or `DATABASE_URL` and defaults to the safe
`mons_catalog_sample` schema. It refuses to replace schemas whose names do not end in `_sample` or
`_test`. Set `MONS_TEST_DATABASE_URL` to a disposable PostgreSQL database before running integration
tests. Container lifecycle belongs to the VPS runbook under `infra/vps`.
