# Regolith marketing

The marketing website for Mons is a server-rendered React application built with TanStack Start,
TanStack Router, Vite, and Nitro. It lives in the Regolith pnpm workspace and participates in the
same Turbo formatting, linting, TypeScript 7, test, and build checks as the API.

## Run locally

From the repository root:

```bash
npx pnpm@11.20.0 install
npx pnpm@11.20.0 dev:marketing
```

Open <http://localhost:3001>. The API continues to use port 3000.

## Commands

```bash
npx pnpm@11.20.0 --filter @regolith/marketing lint
npx pnpm@11.20.0 --filter @regolith/marketing typecheck
npx pnpm@11.20.0 --filter @regolith/marketing test
npx pnpm@11.20.0 --filter @regolith/marketing build
npx pnpm@11.20.0 --filter @regolith/marketing start
```

The production build emits a Nitro Node server under `.output`. The site reuses the locally
bundled Mons Space Grotesk font files and the Lunar Plum light/dark design tokens; it makes no
runtime font requests to a third party.
