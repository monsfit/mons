import { Link } from '@tanstack/react-router'
import { Collection, Table, TableLoadMoreItem } from 'react-aria-components'
import { TableLayout, Virtualizer } from 'react-aria-components/Virtualizer'
import { Flame } from 'lucide-react'
import type { CatalogSearch } from '~/features/catalog/catalog-search'
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

type Workspace = Awaited<ReturnType<typeof getCatalogWorkspace>>
interface FoodExplorerPageProps {
  readonly isPending: boolean
  readonly search: CatalogSearch
  readonly workspace: Workspace
  readonly updateSearch: (next: Partial<CatalogSearch>) => void
}
const kinds: ReadonlyArray<{ id: CatalogSearch['kind']; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'raw', label: 'Raw' },
  { id: 'branded', label: 'Branded' },
  { id: 'restaurant', label: 'Restaurants' },
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
  const updateSearch = (next: Partial<CatalogSearch>) => {
    if (!isPending && JSON.stringify({ ...search, ...next }) === JSON.stringify(search)) return
    invalidate()
    navigate(next)
  }
  const hasActiveFilters =
    search.kind !== 'all' ||
    search.foodGroupId !== 'all' ||
    search.brandId !== 'all' ||
    search.restaurantId !== 'all'

  return (
    <div className="dark catalog-shell">
      <header className="catalog-header">
        <Link to="/" aria-label="Mons home" className="text-lg font-bold tracking-widest">
          MONS
        </Link>
        <h1 className="border-l border-white/15 pl-4 text-sm text-white/60">Foods</h1>
        <div className="min-w-0 flex-1 md:mx-auto md:max-w-xl">
          <CatalogSearchField
            primary
            label="Search foods"
            value={search.q}
            onCommit={(q) => updateSearch({ q })}
          />
        </div>
        <span className="hidden text-xs text-white/40 md:block">{workspace.stage}</span>
      </header>
      <div className="catalog-layout">
        <aside className="catalog-sidebar">
          <section>
            <h2>Type</h2>
            <div role="group" aria-label="Dataset type" className="flex flex-wrap gap-1">
              {kinds.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={search.kind === id}
                  className="rounded px-2 py-1.5 text-xs text-white/60 aria-pressed:bg-white/10 aria-pressed:text-white"
                  onClick={() =>
                    updateSearch({
                      kind: id,
                      brandId: id === 'branded' ? search.brandId : 'all',
                      brandName: id === 'branded' ? search.brandName : '',
                      restaurantId: id === 'restaurant' ? search.restaurantId : 'all',
                      restaurantName: id === 'restaurant' ? search.restaurantName : '',
                    })
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
              <button type="button" onClick={() => updateSearch({ foodGroupId: 'all' })}>
                All groups
              </button>
            </h2>
            <CatalogFacetList
              label="Food groups"
              items={workspace.foodGroups}
              selectedId={search.foodGroupId}
              onSelect={(group) => updateSearch({ foodGroupId: group.id })}
            />
          </section>
          <section>
            <h2>
              Brands{' '}
              <button type="button" onClick={() => updateSearch({ brandId: 'all', brandName: '' })}>
                Clear
              </button>
            </h2>
            <CatalogSearchField
              label="Search brands"
              value={search.brandQuery}
              onCommit={(brandQuery) => updateSearch({ brandQuery })}
            />
            {search.brandId !== 'all' && (
              <p className="mb-2 text-xs text-lime-200">{search.brandName}</p>
            )}
            <CatalogFacetList
              label="Brands"
              key={search.brandQuery}
              kind="brands"
              query={search.brandQuery}
              items={workspace.brands}
              nextOffset={workspace.brandNextOffset}
              selectedId={search.brandId}
              onSelect={(brand) =>
                updateSearch({
                  brandId: brand.id,
                  brandName: brand.name,
                  kind: 'branded',
                  restaurantId: 'all',
                  restaurantName: '',
                })
              }
            />
          </section>
          <section>
            <h2>
              Restaurants{' '}
              <button
                type="button"
                onClick={() => updateSearch({ restaurantId: 'all', restaurantName: '' })}
              >
                Clear
              </button>
            </h2>
            <CatalogSearchField
              label="Search restaurants"
              value={search.restaurantQuery}
              onCommit={(restaurantQuery) => updateSearch({ restaurantQuery })}
            />
            {search.restaurantId !== 'all' && (
              <p className="mb-2 text-xs text-lime-200">{search.restaurantName}</p>
            )}
            <CatalogFacetList
              label="Restaurants"
              key={search.restaurantQuery}
              kind="restaurants"
              query={search.restaurantQuery}
              items={workspace.restaurants}
              nextOffset={workspace.restaurantNextOffset}
              selectedId={search.restaurantId}
              onSelect={(restaurant) =>
                updateSearch({
                  restaurantId: restaurant.id,
                  restaurantName: restaurant.name,
                  kind: 'restaurant',
                  brandId: 'all',
                  brandName: '',
                })
              }
            />
          </section>
          <p className="py-3 text-[10px] text-white/35">
            Catalog release {workspace.releaseId.slice(0, 10)} · Counts across the catalog
          </p>
        </aside>
        <main className="catalog-main">
          <div role="status" className="catalog-results-status">
            <span>
              {isPending
                ? 'Updating results…'
                : search.q === ''
                  ? 'Search the food catalog'
                  : `${foods.length}${nextOffset === null ? '' : '+'} results`}
            </span>
            {search.q !== '' && <span>“{search.q}”</span>}
            {hasActiveFilters && (
              <button
                type="button"
                className="text-lime-200"
                onClick={() =>
                  updateSearch({
                    brandId: 'all',
                    brandName: '',
                    foodGroupId: 'all',
                    kind: 'all',
                    restaurantId: 'all',
                    restaurantName: '',
                  })
                }
              >
                Clear filters
              </button>
            )}
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
                      ? 'Enter at least 2 characters to find foods.'
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
