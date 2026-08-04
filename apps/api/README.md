# Regolith API

The API exposes the active food catalog through Hono and reads PostgreSQL through Kysely.
Valibot schemas provide runtime validation and generate the OpenAPI 3.1 contract.

## Run locally

From the repository root:

```bash
npx pnpm@11.20.0 db:up
npx pnpm@11.20.0 dev
```

The service uses these environment variables:

| Variable          | Default                                                        |
| ----------------- | -------------------------------------------------------------- |
| `DATABASE_URL`    | `postgresql://regolith:regolith_local@localhost:5432/regolith` |
| `REGOLITH_SCHEMA` | `regolith`                                                     |
| `API_PORT`        | `3000`                                                         |

## Routes

| Method | Path                      | Purpose                                            |
| ------ | ------------------------- | -------------------------------------------------- |
| `GET`  | `/health`                 | Process health                                     |
| `GET`  | `/v1/catalog`             | Active snapshot metadata and row counts            |
| `GET`  | `/v1/foods/by-gtin/:gtin` | Branded-food lookup by normalized 14-digit GTIN    |
| `GET`  | `/v1/foods/search`        | Ranked name search with optional dataset filtering |
| `GET`  | `/openapi.json`           | Generated OpenAPI 3.1 document                     |
| `GET`  | `/docs`                   | Interactive Scalar API reference                   |

Search accepts `q`, optional `kind=raw|branded`, and optional `limit=1..100`.

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
