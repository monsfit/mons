# Nutrition ingest

The nutrition-ingest service converts public food datasets into one deterministic schema, publishes versioned
JSONL snapshots with verification manifests, and atomically loads those snapshots into
PostgreSQL.

Run all commands below from the monorepo root.

## Setup

```bash
uv sync --project services/nutrition-ingest --all-extras
```

The active contract is schema `2.0.0`. Nutrients are normalized per 100 g.

## Build snapshots

Build the combined non-branded snapshot from the conventional `data/inputs` layout:

```bash
npx pnpm@11.20.0 titan normalize-raw --inputs-dir data/inputs
```

Build the branded snapshot from USDA and Open Food Facts:

```bash
npx pnpm@11.20.0 titan merge-off-branded \
  --usda-branded data/inputs/FoodData_Central_branded_food_json_2025-12-18.json \
  --off-parquet data/inputs/food.parquet \
  --nutrient-csv data/inputs/FoodData_Central_csv_2025-04-24/nutrient.csv
```

Default outputs are:

```text
data/outputs/v2/raw-foods.jsonl
data/outputs/v2/raw-foods.rejected.jsonl
data/outputs/v2/raw-foods.manifest.json

data/outputs/v2/branded-foods.jsonl
data/outputs/v2/branded-foods.rejected.jsonl
data/outputs/v2/branded-foods.manifest.json
```

The manifest is published last. It records schema and package versions, input and output
hashes, counts, quality thresholds, rejection reasons, and per-source field coverage. A
failed run never replaces the last successful output.

All parsers support `--output`, `--rejects`, `--manifest`, rejection thresholds, and progress
intervals. Use `--output -` for non-transactional stdout without sidecars.

## Sources

| Dataset | Snapshot role | Command |
|---|---|---|
| Australian Food Composition Database | Raw | `titan australia` |
| Canadian Nutrient File | Raw | `titan canada` |
| UK CoFID | Raw | `titan cofid` |
| Dutch NEVO | Raw | `titan nevo` |
| New Zealand FOODfiles | Raw | `titan new-zealand` |
| USDA FoodData Central | Raw and branded | `titan usda` / `titan merge-off-branded` |
| Open Food Facts | Branded | `titan merge-off-branded` |

Use `npx pnpm@11.20.0 titan <command> --help` for source-specific paths and options. Source
provenance and redistribution status are maintained in [DATA_SOURCES.md](DATA_SOURCES.md).

USDA wins when it and Open Food Facts contain the same valid GTIN. Branded rows are published
only when they have a valid GTIN, a display-safe name, and finite calories, protein, fat, and
carbohydrate values per 100 g. Calories must be between 0 and 1,000 kcal, individual macros
between 0 and 100 g, and their combined weight at most 120 g. Open Food Facts rows marked
obsolete, without nutrition data, or with source quality-error tags are excluded. Nutrition ingest reads
only explicit Open Food Facts `100g` nutriment values; serving values are never relabeled as
per-100-g data. Source names written entirely in uppercase are deterministically converted to
display case; existing mixed-case and non-Latin names are preserved.

## Contract

[`titan/common/schema.py`](titan/common/schema.py) is the source of truth for field order,
units, descriptions, and direct-versus-derived value semantics. Raw foods contain the common
fields. Branded foods add nullable `brand` and normalized 14-digit `gtin` fields.

The carbohydrate fields deliberately distinguish source values from calculations:

- `carbohydrates_total`: source-reported total or by-difference carbohydrate.
- `carbohydrates_available`: source-reported available carbohydrate.
- `carbohydrates_net_calculated`: total minus fibre, only when both operands exist.

Generate the language-neutral raw and branded JSON Schemas with:

```bash
npx pnpm@11.20.0 contracts
```

## PostgreSQL

```bash
npx pnpm@11.20.0 db:status
npx pnpm@11.20.0 db:ingest
```

Ingestion verifies both manifests and hashes, validates every row, streams data with `COPY`,
builds indexes, checks counts and coverage, and atomically swaps a staging schema into place.
An advisory lock prevents concurrent ingestion into the same database.

```text
regolith.foods                    partitioned parent
├── regolith.raw_foods
└── regolith.branded_foods

regolith.portions                 partitioned parent
├── regolith.raw_portions
└── regolith.branded_portions

regolith.nutrient_definitions     field units and descriptions
regolith.ingestion_runs           snapshot provenance and load status
```

The local Compose defaults are database/user `regolith`, password `regolith_local`, and port `5432`.
Override them through `.env` or command options. The `mons-postgres` volume persists across
ordinary container restarts.

## Development

```bash
npx pnpm@11.20.0 nutrition:lint
npx pnpm@11.20.0 nutrition:typecheck
npx pnpm@11.20.0 nutrition:test
npx pnpm@11.20.0 nutrition:test:postgres
```

Small deterministic tests do not require source downloads. When `data/inputs` exists, the
same suite automatically exercises every available source parser and unit contract.

Nutrition ingest is Apache-2.0 software. That license does not grant redistribution rights for source
or generated datasets; consult [DATA_SOURCES.md](DATA_SOURCES.md) before publishing data.
