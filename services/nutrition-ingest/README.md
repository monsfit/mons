# Mons nutrition

This service normalizes public food datasets, creates one immutable release, and atomically loads
that release into PostgreSQL. Run commands from the monorepo root.

## Setup

```bash
uv sync --project services/nutrition-ingest
```

The active normalized schema is `2.0.0`. Nutrients are expressed per 100 g.

## Normal flow

```bash
pnpm nutrition build
pnpm nutrition publish
```

`build` reads the conventional `data/inputs` layout and writes:

```text
data/outputs/v2/
  foods.parquet
  manifest.json
  rejects.jsonl
```

`foods.parquet` is the canonical artifact for local analysis and PostgreSQL loading. Its
`dataset_kind` column distinguishes `raw` and `branded` rows. `rejects.jsonl` is a local build
diagnostic and is not published.

`publish` verifies the current build, archives every original input by SHA-256, uploads the
Parquet artifact to the private `mons-nutrition` R2 bucket, and uploads `manifest.json` last. A
completed release cannot be overwritten.

```text
sources/<sha256>/<original-filename>
releases/<release-id>/
  foods.parquet
  manifest.json
```

Release IDs use `<UTC-date>-<content-hash>`, for example `2026-08-27-a1b2c3d4`.

## Database promotion

Run the **Load nutrition release** GitHub workflow with a release ID and either `dev` or
`production`. The workflow downloads and verifies the release over R2, joins Tailscale, loads a
staging schema, validates it, grants the runtime role access, and atomically swaps it to
`mons_catalog`.

Personal and preview SST stages share the dev database's `mons_catalog`. They never copy or rebuild
the nutrition catalog. Production loads the exact release already tested in dev. Loading an older
release is the rollback procedure.

For a direct status check:

```bash
pnpm db:status
```

`MIGRATION_DATABASE_URL` is required. There is deliberately no implicit local database URL.

## Environment

Local commands read the ignored root `.env` file. Existing process variables win over file values.

Publishing uses:

```text
CLOUDFLARE_DEFAULT_ACCOUNT_ID
CLOUDFLARE_ACCESS_KEY_ID
CLOUDFLARE_SECRET_ACCESS_KEY
```

Loading also uses:

```text
MIGRATION_DATABASE_URL
MONS_DATABASE_RUNTIME_USER
```

## Parser development

Small deterministic parser tests do not require source downloads. The parsers are internal modules;
`pnpm nutrition build` is the only supported way to produce a complete release.

## Sources

| Dataset | Provider | Upstream |
|---|---|---|
| Australian Food Composition Database | Food Standards Australia New Zealand | <https://www.foodstandards.gov.au/science-data/food-nutrient-databases/afcd/data-files> |
| Canadian Nutrient File | Health Canada | <https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/nutrient-data/canadian-nutrient-file-2015-download-files.html> |
| CoFID | UK Government | <https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid> |
| NEVO | RIVM | <https://www.rivm.nl/en/dutch-food-composition-database> |
| New Zealand FOODfiles | New Zealand Institute for Public Health and Forensic Science | <https://www.foodcomposition.co.nz/foodfiles/concise-tables/> |
| USDA FoodData Central | U.S. Department of Agriculture | <https://fdc.nal.usda.gov/> |
| Open Food Facts | Open Food Facts | <https://world.openfoodfacts.org/data> |

USDA wins when it and Open Food Facts contain the same valid GTIN. The existing parser quality and
nutrition validation rules remain unchanged.

## Verification

```bash
pnpm nutrition:lint
pnpm nutrition:typecheck
pnpm nutrition:test
pnpm nutrition:test:postgres
```

The PostgreSQL integration test runs only when `MONS_TEST_DATABASE_URL` is explicitly provided. CI
provides a disposable PostgreSQL service.
