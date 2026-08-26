# Regolith API

The API exposes the active food catalog through Effect's HTTP platform and reads PostgreSQL
through Effect SQL. Effect Schema provides runtime validation, typed errors, and the OpenAPI 3.1
contract from the same declarative endpoint definitions.

## Run locally

From the repository root:

```bash
npx pnpm@11.20.0 db:migrate
npx pnpm@11.20.0 dev
```

The service uses these environment variables:

| Variable                            | Default                                                        |
| ----------------------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`                      | `postgresql://regolith:regolith_local@localhost:5432/regolith` |
| `CLERK_PUBLISHABLE_KEY`             | required; pull with the Clerk CLI                              |
| `CLERK_SECRET_KEY`                  | required; pull with the Clerk CLI                              |
| `REGOLITH_SCHEMA`                   | `regolith`                                                     |
| `REGOLITH_APP_SCHEMA`               | `regolith_app`                                                 |
| `API_PORT`                          | `3000`                                                         |
| `API_HOST`                          | `0.0.0.0`                                                      |
| `AI_GATEWAY_API_KEY`                | required only when an AI operation runs                        |
| `AI_GATEWAY_MODEL`                  | `google/gemini-3.7-flash`                                      |
| `AI_GATEWAY_MEAL_OBSERVATION_MODEL` | `google/gemini-3.7-flash`                                      |
| `AI_GATEWAY_MEAL_RESOLUTION_MODEL`  | `google/gemini-3.7-flash`                                      |
| `AI_GATEWAY_TRANSCRIPTION_MODEL`    | `google/gemini-3.7-flash`                                      |
| `R2_ACCOUNT_ID`                     | optional Cloudflare account ID                                 |
| `R2_ACCESS_KEY_ID`                  | optional R2 S3 access-key ID                                   |
| `R2_SECRET_ACCESS_KEY`              | optional R2 S3 secret access key                               |
| `R2_BUCKET_NAME`                    | `mons`                                                         |

Standalone Node development uses Vercel AI Gateway as a hosted model router, but it is not deployed
to Vercel. `AI_GATEWAY_API_KEY` is read from the process environment by the AI SDK. The Cloudflare
Worker instead uses its native AI binding with the stage's `mons-*` AI Gateway and Unified Billing.

R2 uses Cloudflare's account-level S3 endpoint,
`https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`; the bucket is supplied separately on every
request. Do not append `/mons` to `endpoint`. The R2 Effect service owns and closes its S3 client,
keeps credentials redacted, validates object keys, and maps SDK failures into typed errors.
The API still starts when R2 is not configured so profile, nutrition, food-log, and workout routes
remain usable; only meal-estimation operations that require media storage fail.

## Routes

| Method   | Path                                                    | Purpose                                          |
| -------- | ------------------------------------------------------- | ------------------------------------------------ |
| `GET`    | `/health`                                               | Process health                                   |
| `GET`    | `/v1/catalog`                                           | Active snapshot metadata and row counts          |
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

The server applies stable application migrations before listening. Catalog ingestion remains
owned by Titan; `db:migrate` upgrades an older local catalog with the full-text search vector
and GIN indexes.

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

## Development

```bash
npx pnpm@11.20.0 --filter @regolith/api test
npx pnpm@11.20.0 --filter @regolith/api typecheck
npx pnpm@11.20.0 --filter @regolith/api ai:smoke
npx pnpm@11.20.0 --filter @regolith/api meal:smoke
npx pnpm@11.20.0 --filter @regolith/api r2:smoke
npx pnpm@11.20.0 openapi
```

Set `MEAL_SMOKE_AUDIO_PATH` to a local M4A, MP3, WAV, or WebM file to include live transcription
in the meal smoke test; otherwise it exercises the text-to-catalog path.

`openapi.json` and the interactive Scalar page are generated directly by Effect's HTTP API
declaration. Request decoding failures are transformed into deterministic JSON validation errors.
The ignored `.repos/effect` clone is prepared at the exact installed Effect tag so framework source
is locally inspectable without becoming part of this repository.
