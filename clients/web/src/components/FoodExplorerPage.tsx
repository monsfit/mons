import { Link } from '@tanstack/react-router'
import { Collection, Table, TableLoadMoreItem } from 'react-aria-components'
import { TableLayout, Virtualizer } from 'react-aria-components/Virtualizer'
import { Flame } from 'lucide-react'
import type {
  CatalogSearch,
  CatalogSearchUpdate,
  CatalogDatasetKind,
} from '~/features/catalog/catalog-search'
import {
  foodAttribution,
  foodPortionLabel,
  formatFoodNutrient,
} from '~/features/catalog/catalog-presentation'
import type { getCatalogWorkspace } from '~/features/catalog/catalog-functions'
import { useCatalogPages } from '~/features/catalog/use-catalog-pages'
import { CatalogSourceBadge } from './CatalogSourceBadge'
import { CatalogSearchField } from './CatalogSearchField'
import { CatalogFacetList } from './CatalogFacetList'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

import { parseCatalogSearch, toggleFilter } from '~/features/catalog/catalog-search'

type Workspace = Awaited<ReturnType<typeof getCatalogWorkspace>>
interface FoodExplorerPageProps {
  readonly isPending: boolean
  readonly search: CatalogSearch
  readonly workspace: Workspace
  readonly updateSearch: (next: CatalogSearchUpdate) => void
}
const kinds: ReadonlyArray<{ id: CatalogDatasetKind; label: string }> = [
  { id: 'raw', label: 'Raw' },
  { id: 'branded', label: 'Branded' },
  { id: 'restaurant', label: 'Restaurant' },
]
export function FoodExplorerPage({
  search,
  updateSearch: navigate,
  workspace,
  isPending,
}: FoodExplorerPageProps) {
  const { foods, nextOffset, status, loadMore, invalidate } = useCatalogPages(
    search,
    workspace,
    isPending,
  )
  const updateSearch = (next: CatalogSearchUpdate) => {
    invalidate()
    navigate(next)
  }
  const hasActiveFilters =
    search.kinds.length + search.groups.length + search.brands.length + search.restaurants.length >
    0
  const facets: ReadonlyArray<{ key: 'groups' | 'brands' | 'restaurants'; label: string }> = [
    { key: 'groups', label: 'Group' },
    { key: 'brands', label: 'Brand' },
    { key: 'restaurants', label: 'Restaurant' },
  ]
  return (
    <div className="dark catalog-shell">
      <header className="catalog-header">
        <Link to="/" aria-label="Mons home" className="text-lg font-bold tracking-widest">
          MONS
        </Link>
        <h1 className="border-l border-white/15 pl-4 text-sm text-white/60">Foods</h1>
        <span className="ml-auto text-xs text-white/40">{workspace.stage}</span>
      </header>
      <div className="catalog-layout">
        <aside className="catalog-sidebar">
          <section>
            <h2>Type</h2>
            <div role="group" aria-label="Dataset type" className="flex flex-wrap gap-1">
              <button
                type="button"
                aria-pressed={search.kinds.length === 0}
                className="rounded px-2 py-1.5 text-xs aria-pressed:bg-white/10"
                onClick={() => updateSearch({ kinds: [] })}
              >
                All
              </button>
              {kinds.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={search.kinds.includes(id)}
                  className="rounded px-2 py-1.5 text-xs text-white/60 aria-pressed:bg-white/10 aria-pressed:text-white"
                  onClick={() =>
                    updateSearch((current) => ({
                      ...current,
                      kinds: current.kinds.includes(id)
                        ? current.kinds.filter((kind) => kind !== id)
                        : [...current.kinds, id],
                    }))
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h2>
              Food groups{' '}
              <button type="button" onClick={() => updateSearch({ groups: [] })}>
                All groups
              </button>
            </h2>
            <CatalogFacetList
              label="Food groups"
              key={workspace.releaseId}
              items={workspace.foodGroups}
              selectedIds={search.groups.map((item) => item.id)}
              onSelect={(group) =>
                updateSearch((current) => ({
                  ...current,
                  groups: toggleFilter(current.groups, group),
                }))
              }
            />
          </section>
          <section>
            <h2>
              Brands{' '}
              <button type="button" onClick={() => updateSearch({ brands: [] })}>
                Clear
              </button>
            </h2>
            <CatalogSearchField
              label="Search brands"
              value={search.brandQuery}
              onCommit={(brandQuery) => updateSearch({ brandQuery })}
            />
            <CatalogFacetList
              key={`${workspace.releaseId}:${search.brandQuery}`}
              label="Brands"
              kind="brands"
              query={search.brandQuery}
              items={workspace.brands}
              nextOffset={workspace.brandNextOffset}
              selectedIds={search.brands.map((item) => item.id)}
              onSelect={(brand) =>
                updateSearch((current) => ({
                  ...current,
                  brands: toggleFilter(current.brands, brand),
                }))
              }
            />
          </section>
          <section>
            <h2>
              Restaurants{' '}
              <button type="button" onClick={() => updateSearch({ restaurants: [] })}>
                Clear
              </button>
            </h2>
            <CatalogSearchField
              label="Search restaurants"
              value={search.restaurantQuery}
              onCommit={(restaurantQuery) => updateSearch({ restaurantQuery })}
            />
            <CatalogFacetList
              key={`${workspace.releaseId}:${search.restaurantQuery}`}
              label="Restaurants"
              kind="restaurants"
              query={search.restaurantQuery}
              items={workspace.restaurants}
              nextOffset={workspace.restaurantNextOffset}
              selectedIds={search.restaurants.map((item) => item.id)}
              onSelect={(restaurant) =>
                updateSearch((current) => ({
                  ...current,
                  restaurants: toggleFilter(current.restaurants, restaurant),
                }))
              }
            />
          </section>
          <p className="py-3 text-[10px] text-white/35">
            Catalog release {workspace.releaseId.slice(0, 10)} · Counts across the catalog
          </p>
        </aside>
        <main className="catalog-main">
          <div className="border-b border-white/10 p-3">
            <CatalogSearchField
              primary
              label="Search foods"
              value={search.q}
              onCommit={(q) => updateSearch({ q })}
            />
          </div>
          <section
            aria-label="Active filters"
            className="flex max-h-36 shrink-0 flex-wrap items-center gap-2 overflow-y-auto border-b border-white/10 p-3 text-xs"
          >
            <span className="mr-1 text-white/50">Filters</span>
            {search.kinds.map((kind) => (
              <button
                key={kind}
                type="button"
                aria-label={`Remove type: ${kind}`}
                className="rounded border border-white/15 bg-white/5 px-2 py-1"
                onClick={() =>
                  updateSearch((current) => ({
                    ...current,
                    kinds: current.kinds.filter((value) => value !== kind),
                  }))
                }
              >
                Type: {kind} <span aria-hidden="true">×</span>
              </button>
            ))}
            {facets.flatMap(({ key, label }) =>
              search[key].map((item) => (
                <button
                  key={`${key}:${item.id}`}
                  type="button"
                  aria-label={`Remove ${label.toLowerCase()}: ${item.name}`}
                  className="rounded border border-white/15 bg-white/5 px-2 py-1"
                  onClick={() =>
                    updateSearch((current) => ({
                      ...current,
                      [key]: current[key].filter((value) => value.id !== item.id),
                    }))
                  }
                >
                  {label}: {item.name} <span aria-hidden="true">×</span>
                </button>
              )),
            )}
            {!hasActiveFilters && <span className="text-white/35">None · showing all foods</span>}
            {hasActiveFilters && (
              <button
                type="button"
                className="ml-auto text-lime-200"
                onClick={() =>
                  updateSearch((current) => ({
                    ...parseCatalogSearch({}),
                    q: current.q,
                    brandQuery: current.brandQuery,
                    restaurantQuery: current.restaurantQuery,
                  }))
                }
              >
                Clear filters
              </button>
            )}
          </section>
          <div role="status" className="catalog-results-status">
            <span>
              {isPending
                ? 'Updating results…'
                : `${foods.length}${nextOffset === null ? '' : '+'} results`}
            </span>
            <span>{search.q === '' ? 'All foods' : `“${search.q}”`}</span>
            <span className="ml-auto text-white/45">Per portion · basis when unavailable</span>
          </div>
          <Virtualizer
            layout={TableLayout}
            layoutOptions={{ rowHeight: 76, headingHeight: 38, loaderHeight: 48 }}
          >
            <Table
              key={JSON.stringify(search)}
              aria-label="Food catalog results"
              aria-busy={isPending}
              className="catalog-table"
              data-loaded-count={foods.length}
            >
              <TableHeader>
                <TableHead id="food" isRowHeader width={370}>
                  Food
                </TableHead>
                <TableHead id="source" width={190}>
                  Source
                </TableHead>
                <TableHead id="group" width={150}>
                  Group
                </TableHead>
                <TableHead id="calories" width={110}>
                  Calories
                </TableHead>
                <TableHead id="protein" width={90}>
                  Protein
                </TableHead>
                <TableHead id="fat" width={90}>
                  Fat
                </TableHead>
                <TableHead id="carbs" width={90}>
                  Carbs
                </TableHead>
              </TableHeader>
              <TableBody
                renderEmptyState={() => (
                  <div className="p-8 text-sm text-white/50">
                    {search.q === ''
                      ? 'No matching foods. Try clearing a filter.'
                      : 'No matching foods. Try a broader term or clear a filter.'}
                  </div>
                )}
              >
                <Collection items={foods}>
                  {(food) => (
                    <TableRow id={`${food.datasetKind}:${food.foodId}`} textValue={food.name}>
                      <TableCell>
                        <Link
                          to="/food/$kind/$foodId"
                          params={{ kind: food.datasetKind, foodId: food.foodId }}
                          className="block min-w-0 rounded outline-offset-2 focus-visible:outline-2 focus-visible:outline-lime-200"
                        >
                          <span
                            className="block truncate text-sm font-medium"
                            title={`${food.name} ${foodAttribution(food) ?? ''}`}
                          >
                            {food.name}{' '}
                            <span className="font-normal text-white/55">
                              {foodAttribution(food)}
                            </span>
                          </span>
                          <span className="mt-1 flex items-center gap-1 text-xs text-white/50">
                            <Flame className="size-3.5 shrink-0 text-orange-400" />
                            {formatFoodNutrient(food, food.calories, 'kcal')}
                            <span>·</span>
                            <span className="truncate">{foodPortionLabel(food)}</span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <CatalogSourceBadge source={food.source} />
                        <span className="mt-1 block text-[10px] text-white/40">
                          {food.datasetKind}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="block truncate text-xs">{food.foodGroup}</span>
                        <span className="block truncate text-[10px] text-white/40">
                          {food.foodSubgroup}
                        </span>
                      </TableCell>
                      <TableCell>{formatFoodNutrient(food, food.calories, 'kcal')}</TableCell>
                      <TableCell>{formatFoodNutrient(food, food.protein)}</TableCell>
                      <TableCell>{formatFoodNutrient(food, food.totalFat)}</TableCell>
                      <TableCell>{formatFoodNutrient(food, food.carbohydrates)}</TableCell>
                    </TableRow>
                  )}
                </Collection>
                {nextOffset !== null && status !== 'error' && !isPending && (
                  <TableLoadMoreItem
                    isLoading={status === 'loading'}
                    onLoadMore={() => void loadMore()}
                    className="p-4 text-xs text-white/45"
                  >
                    Loading more foods…
                  </TableLoadMoreItem>
                )}
              </TableBody>
            </Table>
          </Virtualizer>
          {status === 'error' && (
            <button
              type="button"
              className="p-3 text-xs text-amber-300"
              onClick={() => void loadMore()}
            >
              Couldn’t load more. Retry
            </button>
          )}
          {nextOffset === null && foods.length > 0 && (
            <p className="p-2 text-center text-[10px] text-white/35">End of results</p>
          )}
        </main>
      </div>
    </div>
  )
}
