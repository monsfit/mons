# Contracts

This package owns the API's Effect schemas and Titan's generated language-neutral food schemas.

- `src/index.ts`: runtime validation and TypeScript types used by the Effect HTTP API.
- `schema/raw-food-v2.schema.json`: normalized raw-food contract.
- `schema/branded-food-v2.schema.json`: normalized branded-food contract.

The JSON Schema files are generated from Titan's Python source of truth. Do not edit them by
hand.

```bash
npx pnpm@11.20.0 contracts
npx pnpm@11.20.0 contracts:check
```
