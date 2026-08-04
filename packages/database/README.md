# Database

This package contains the Kysely types, PostgreSQL client factory, migrations, catalog reader,
and application repository used by the API. Titan owns replaceable catalog ingestion. This
package owns the stable `regolith_app` schema.

The repository supports:

- active snapshot status and dataset counts;
- exact branded-food lookup by normalized GTIN, guarded by the catalog quality contract;
- weighted full-text food and brand search with trigram fallback and USDA-first branded ties;
- idempotent profile and food-log persistence with nutrient snapshots;
- one server-calculated nutrition plan per profile, including its source inputs and calculation
  timestamp;
- atomic workout and ordered-set persistence.

Application tables are intentionally separate from the `regolith` catalog schema. Titan can
atomically replace the catalog without deleting user history.

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
npx pnpm@11.20.0 db:up
npx pnpm@11.20.0 db:migrate
npx pnpm@11.20.0 test:database
```
