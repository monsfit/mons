# Mons web

The Mons web client is a server-rendered TanStack Start application running on Cloudflare Workers.
It serves the public website and shared web tools, beginning with the catalog workspace at
`/foods`. The workspace searches the normalized raw, branded, and restaurant catalog directly from
PostgreSQL through Hyperdrive.

The interface uses Tailwind CSS and shadcn's React Aria component base. It is intentionally
unauthenticated for now.

## Run locally

Start the repository's PostgreSQL container, then run the web client:

```bash
pnpm dev:database
pnpm db:migrate
pnpm dev:web
```

Wrangler reads the ignored `clients/web/.env` file. Copy `.env.example` to `.env` if it does not
exist; its binding-specific local Hyperdrive variable points at the local `mons` database. Open
<http://localhost:3001/foods>. The API continues to use port 3000.

## Data path

```text
TanStack Start server function
  -> Effect CatalogReader
  -> Wrangler local Hyperdrive binding
  -> local PostgreSQL mons_catalog schema
```

Search and filters are encoded in the URL. Food groups, brands, dataset counts, food results, and
the active catalog release are all read from the database; no catalog fixture is bundled into the
web client.

Food, brand, and restaurant searches update after 300 ms without typing; Enter submits immediately.
Food searches need at least two characters. An empty input browses the first 50 foods in stable
food-ID order, with the current filters applied and more pages available on scroll; a single
character waits for more input. Brand/restaurant text narrows the
corresponding picker; selecting a result applies that filter.
Types, groups, brands, and restaurants accept multiple selections: values within a facet are ORed,
and different facets are ANDed. The table toolbar shows removable chips and a clear-all action.
Selecting one facet never silently removes another. Incompatible combinations show no matches.
Selections are serialized in the URL and restored on reload; old single-selection URLs still work.
Changes replace the current URL entry, preserve focus, and reset table pagination. The table loads
50 rows at a time near the bottom. Brand and restaurant pickers load 30 items per page; the small
food-group taxonomy fits in one page. TanStack Table owns the food table's column definitions,
sizes, row model, stable row IDs, and cell rendering. Filtering and pagination stay server-side;
the table never filters or paginates just the loaded subset. React Aria provides the accessible
table surface and virtualizes all three pickers and the table,
including horizontally virtualized macro/micronutrient columns. Food, Source, and Group are pinned
when the table viewport is at least 900px wide; smaller viewports scroll the entire table so all
nutrients remain reachable. Source, type, group, and subgroup labels use compact tags. Missing
nutrients display as a dash, and micronutrients retain small nonzero values after portion scaling.
The virtualizer retains keyboard-focused items. Scrolling loads subsequent pages, failed requests offer retry,
and changing a search resets its collection. Counts on facets describe the whole catalog, not the
current search results.

Select a food to open `/food/:kind/:foodId`. This read-only page shows the full reported nutrient
record, a portion selector, nutrition facts, and grouped nutrient breakdowns. Only portions with
the same unit as the source basis can be used for scaling; volume-to-mass conversions are not
assumed. Missing nutrients remain missing, while reported zeros stay zero. Daily Value comparisons
use the [FDA reference](https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels)
only when the nutrient form and unit are comparable. Protein quality, calorie-burn estimates,
descriptions, and similar-food recommendations are not inferred from missing source data.

Run the browser interaction regression against a running local web server and populated local
catalog with `pnpm --filter @mons/web test:e2e` (Google Chrome required). It checks debouncing,
filter combinations, virtualized scroll loading, retries, duplicate rows, sticky headers, nutrition
navigation, portion changes, and empty results. Unit tests
cover delayed responses, input composition, request invalidation, and retries. No catalog reload is
performed by these web tests. Database integration tests use isolated test schemas.

## Commands

```bash
pnpm --filter @mons/web lint
pnpm --filter @mons/web typecheck
pnpm --filter @mons/web test
pnpm --filter @mons/web build
pnpm --filter @mons/web types:generate
pnpm deploy:web:dev
pnpm deploy:web:production
```

The `dev` deployment uses the existing development Hyperdrive at `dev.mons.fit`. The production
environment uses the production Hyperdrive at `mons.fit`.
