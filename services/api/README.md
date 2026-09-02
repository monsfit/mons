# Mons API

The API exposes the active food catalog through Effect's HTTP platform and reads PostgreSQL
through Effect SQL. Effect Schema provides runtime validation, typed errors, and the OpenAPI 3.1
contract from the same declarative endpoint definitions.

## Development

From the repository root:

```bash
npx pnpm@11.20.0 db:migrate
npx pnpm@11.20.0 dev
```

`dev` runs the API as the Cloudflare Worker declared in `sst.config.ts`. SST uses its default
personal stage for live development while linking the personal Hyperdrive, Workers AI, R2, and
Clerk resources through native bindings.

## Catalog caching

Food search stays uncached because typed queries are high-cardinality and the PostgreSQL prefix and
full-text indexes are already fast. Authenticated food-by-ID and barcode lookups use the Workers
Cache API after authentication: successful entries live for 30 days, misses for 5 minutes, and
every key includes the immutable catalog release ID. The active release ID is refreshed every 60
seconds, so publishing a new catalog naturally moves lookups into a fresh namespace without a cache
purge. Hyperdrive query caching remains disabled; Hyperdrive is used only for connection pooling.

The iOS client keeps up to 500 resolved catalog foods in its own 30-day, release-scoped disk cache.
Search responses carry the active release ID, and selecting a search result resolves the complete
food before it is displayed or logged.

## Architecture

The API follows one dependency direction:

```text
HTTP API declaration -> handler -> service -> repository -> SQL/external system
```

- `features/<feature>.ts` owns a feature's routes, handlers, service, calculations, and mapping.
- `features/<feature>*.test.ts` contains focused behavior tests beside the feature modules.
- `@mons/database/features/*/repository.ts` owns SQL, transactions, row decoding, ordering, and
  persistence errors.
- `infrastructure/` contains Clerk, AI, and object-storage adapters.
- `core/` contains cross-feature authentication and error types.
- `runtime.ts` wires repositories, services, and infrastructure together.

Add tests for public contracts, authorization, transaction guarantees, non-trivial calculations,
external-system compensation, or reproduced regressions—not file boundaries or simple delegation.

## Routes

| Method   | Path                                                    | Purpose                                          |
| -------- | ------------------------------------------------------- | ------------------------------------------------ |
| `GET`    | `/health`                                               | Process health                                   |
| `GET`    | `/v1/foods/by-gtin/:gtin`                               | Branded-food lookup by normalized 14-digit GTIN  |
| `GET`    | `/v1/foods/search`                                      | Weighted full-text and typo-tolerant search      |
| `PUT`    | `/v1/profile`                                           | Resolve the authenticated account's profile      |
| `GET`    | `/v1/profiles/:profileId/nutrition-plan`                | Read the saved onboarding result                 |
| `PUT`    | `/v1/profiles/:profileId/nutrition-plan`                | Calculate and save a nutrition plan              |
| `GET`    | `/v1/profiles/:profileId/food-log`                      | List food entries in an ISO timestamp range      |
| `POST`   | `/v1/profiles/:profileId/food-log`                      | Idempotently log any supported food source       |
| `DELETE` | `/v1/profiles/:profileId/food-log/:entryId`             | Delete a food entry                              |
| `GET`    | `/v1/profiles/:profileId/custom-foods`                  | List profile-owned custom foods                  |
| `PUT`    | `/v1/profiles/:profileId/custom-foods/:foodId`          | Save manual nutrition, barcode, portions, images |
| `DELETE` | `/v1/profiles/:profileId/custom-foods/:foodId`          | Delete a custom food                             |
| `GET`    | `/v1/profiles/:profileId/recipes`                       | List measured-yield and freeform recipes         |
| `PUT`    | `/v1/profiles/:profileId/recipes/:recipeId`             | Save a recipe and calculate nutrition per 100 g  |
| `DELETE` | `/v1/profiles/:profileId/recipes/:recipeId`             | Delete a recipe                                  |
| `GET`    | `/v1/profiles/:profileId/weight-log`                    | List canonical weight entries                    |
| `POST`   | `/v1/profiles/:profileId/weight-log`                    | Idempotently log a weight measurement            |
| `DELETE` | `/v1/profiles/:profileId/weight-log/:entryId`           | Delete a weight entry                            |
| `GET`    | `/v1/profiles/:profileId/workout-templates`             | List reusable workout templates                  |
| `PUT`    | `/v1/profiles/:profileId/workout-templates/:templateId` | Save an exercise/set template                    |
| `DELETE` | `/v1/profiles/:profileId/workout-templates/:templateId` | Delete a workout template                        |
| `GET`    | `/v1/profiles/:profileId/workouts`                      | List workouts in an ISO timestamp range          |
| `PUT`    | `/v1/profiles/:profileId/workouts/:sessionId`           | Idempotently save a workout and ordered sets     |
| `DELETE` | `/v1/profiles/:profileId/workouts/:sessionId`           | Delete a workout                                 |
| `POST`   | `/v1/profiles/:profileId/meal-estimates`                | Estimate a text, photo, or voice-described meal  |
| `GET`    | `/v1/profiles/:profileId/meal-estimates/:estimateId`    | Reload a persisted estimate and its food matches |
| `GET`    | `/openapi.json`                                         | Generated OpenAPI 3.1 document                   |
| `GET`    | `/docs`                                                 | Interactive Scalar API reference                 |

Search accepts `q`, optional `kind=raw|branded`, and optional `limit=1..100`. Time-range
routes require an inclusive `from` and exclusive `to` ISO timestamp. Weight is persisted in
kilograms; clients may convert it for localized display.

Application migrations run before deployment. The API never migrates on startup. Production
catalog ingestion and catalog indexes are owned by the separately maintained Mons data pipeline;
the public read contract and sample catalog remain in `@mons/database`.

All `/v1` routes require a Clerk session token in the `Authorization: Bearer <token>` header.
`PUT /v1/profile` creates or returns the database profile mapped to the authenticated Clerk user.
Profile-scoped routes verify that the requested internal UUID belongs to that same Clerk user.
Health, OpenAPI JSON, and interactive documentation remain public.

Application migrations use Effect SQL's ordered migrator. Runtime reads and writes are Effect
services backed by `@effect/sql-pg`; rows are decoded at the database boundary with Effect Schema.
Repository defects are logged and mapped to a stable public error without leaking database detail.

Meal estimation has one canonical pipeline. Gemini decomposes photos or text into foods and gram
estimates, `gpt-4o-mini-transcribe` converts voice to text, and Luna resolves observations through
profile-scoped catalog search tools. Tool results contain real food IDs; an ID not returned by a
tool is treated as unresolved. Calories and macros are always scaled by the server from PostgreSQL
per-100-gram values—the models cannot submit nutrient values. Photo media is retained in private R2
by default, voice media is deleted after transcription by default, and clients may override either
with `retainMedia`. Model names, prompt version, media hash, confidence, matches, and quantities are
persisted for auditability. Estimates should be reviewed before creating food-log entries.

Nutrition-plan writes accept measured inputs rather than client-calculated calorie totals. The
API deterministically applies the Mifflin–St Jeor resting-energy equation, a bounded activity
multiplier, and the requested weekly body-weight percentage. Targets never fall below 1,000
kcal/day, and the response reports when that floor limits the requested rate. The feature is
intended for adults and is an estimate, not medical guidance.

## Checks

```bash
npx pnpm@11.20.0 --filter @mons/api test
npx pnpm@11.20.0 --filter @mons/api typecheck
npx pnpm@11.20.0 openapi
```

`openapi.json` and the interactive Scalar page are generated directly by Effect's HTTP API
declaration. Request decoding failures are transformed into deterministic JSON validation errors.
The ignored `.repos/effect` clone is prepared at the exact installed Effect tag so framework source
is locally inspectable without becoming part of this repository.
