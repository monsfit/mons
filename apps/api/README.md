# Regolith API

The API exposes the active food catalog through Hono and reads PostgreSQL through Kysely.
Valibot schemas provide runtime validation and generate the OpenAPI 3.1 contract.

## Run locally

From the repository root:

```bash
npx pnpm@11.20.0 db:up
npx pnpm@11.20.0 db:migrate
npx pnpm@11.20.0 dev
```

The service uses these environment variables:

| Variable              | Default                                                        |
| --------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`        | `postgresql://regolith:regolith_local@localhost:5432/regolith` |
| `REGOLITH_SCHEMA`     | `regolith`                                                     |
| `REGOLITH_APP_SCHEMA` | `regolith_app`                                                 |
| `API_PORT`            | `3000`                                                         |

## Routes

| Method   | Path                                          | Purpose                                         |
| -------- | --------------------------------------------- | ----------------------------------------------- |
| `GET`    | `/health`                                     | Process health                                  |
| `GET`    | `/v1/catalog`                                 | Active snapshot metadata and row counts         |
| `GET`    | `/v1/foods/by-gtin/:gtin`                     | Branded-food lookup by normalized 14-digit GTIN |
| `GET`    | `/v1/foods/search`                            | Weighted full-text and typo-tolerant search     |
| `PUT`    | `/v1/profiles/:profileId`                     | Create or touch an app profile                  |
| `GET`    | `/v1/profiles/:profileId/nutrition-plan`      | Read the saved onboarding result                |
| `PUT`    | `/v1/profiles/:profileId/nutrition-plan`      | Calculate and save a nutrition plan             |
| `GET`    | `/v1/profiles/:profileId/food-log`            | List food entries in an ISO timestamp range     |
| `POST`   | `/v1/profiles/:profileId/food-log`            | Idempotently log a catalog food                 |
| `DELETE` | `/v1/profiles/:profileId/food-log/:entryId`   | Delete a food entry                             |
| `GET`    | `/v1/profiles/:profileId/workouts`            | List workouts in an ISO timestamp range         |
| `PUT`    | `/v1/profiles/:profileId/workouts/:sessionId` | Idempotently save a workout and ordered sets    |
| `DELETE` | `/v1/profiles/:profileId/workouts/:sessionId` | Delete a workout                                |
| `GET`    | `/openapi.json`                               | Generated OpenAPI 3.1 document                  |
| `GET`    | `/docs`                                       | Interactive Scalar API reference                |

Search accepts `q`, optional `kind=raw|branded`, and optional `limit=1..100`. Time-range
routes require an inclusive `from` and exclusive `to` ISO timestamp.

The server applies stable application migrations before listening. Catalog ingestion remains
owned by Titan; `db:migrate` upgrades an older local catalog with the full-text search vector
and GIN indexes.

Profile UUIDs currently provide local data partitioning, not authentication. Keep this API on
a trusted development network until an identity provider and authorization layer are added.

Nutrition-plan writes accept measured inputs rather than client-calculated calorie totals. The
API deterministically applies the Mifflin–St Jeor resting-energy equation, a bounded activity
multiplier, and the requested weekly body-weight percentage. Targets never fall below 1,000
kcal/day, and the response reports when that floor limits the requested rate. The feature is
intended for adults and is an estimate, not medical guidance.

## Development

```bash
npx pnpm@11.20.0 --filter @regolith/api test
npx pnpm@11.20.0 --filter @regolith/api typecheck
npx pnpm@11.20.0 openapi
```

`hono-openapi` statically imports the Standard Schema validator, JSON Schema adapter, and
OpenAPI adapter. Those peer packages are intentionally declared directly because pnpm does
not make undeclared peers available. Valibot's conversion package is loaded by the adapter
for schema generation.
