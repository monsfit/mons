import { Link } from '@tanstack/react-router'
import {
  Building2,
  Database,
  Leaf,
  Layers3,
  Package,
  RefreshCw,
  Search,
  Shapes,
  Sparkles,
  Tag,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'

import type { CatalogSearch } from '~/features/catalog/catalog-search'
import { formatCompactCount } from '~/features/catalog/catalog-search'
import { formatFoodNutrient } from '~/features/catalog/catalog-presentation'
import type { getCatalogWorkspace } from '~/features/catalog/catalog-functions'
import { CatalogSourceBadge } from '~/components/CatalogSourceBadge'
import { FoodDetailsSheet } from '~/components/FoodDetailsSheet'
import { Badge } from '~/components/ui/badge'
import { CatalogSearchField } from './CatalogSearchField'
import { useCatalogPages } from '~/features/catalog/use-catalog-pages'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'

type Workspace = Awaited<ReturnType<typeof getCatalogWorkspace>>

interface FoodExplorerPageProps {
  readonly isPending: boolean
  readonly search: CatalogSearch
  readonly workspace: Workspace
  readonly updateSearch: (next: Partial<CatalogSearch>) => void
}

const datasetLabels = {
  all: 'All',
  branded: 'Branded',
  raw: 'Raw',
  restaurant: 'Restaurants',
} as const

const datasetOptions: ReadonlyArray<{
  readonly id: keyof typeof datasetLabels
  readonly label: string
}> = [
  { id: 'all', label: datasetLabels.all },
  { id: 'raw', label: datasetLabels.raw },
  { id: 'branded', label: datasetLabels.branded },
  { id: 'restaurant', label: datasetLabels.restaurant },
]

const datasetIcons: Readonly<Record<Exclude<keyof typeof datasetLabels, 'all'>, LucideIcon>> = {
  branded: Package,
  raw: Leaf,
  restaurant: UtensilsCrossed,
}

function DatasetIcon({ kind }: Readonly<{ kind: Exclude<keyof typeof datasetLabels, 'all'> }>) {
  const Icon = datasetIcons[kind]
  return <Icon className="size-3.5" />
}

export function FoodExplorerPage({
  search,
  updateSearch: navigate,
  workspace,
  isPending,
}: FoodExplorerPageProps) {
  const { foods, nextOffset, status, loadMore, invalidate, resultsScrollRef, loadMoreRef } =
    useCatalogPages(search, workspace, isPending)
  const updateSearch = (next: Partial<CatalogSearch>) => {
    if (!isPending && JSON.stringify({ ...search, ...next }) === JSON.stringify(search)) return
    invalidate()
    navigate(next)
  }
  const totalFoods = workspace.foodGroups.reduce((sum, group) => sum + group.foodCount, 0)
  const activeGroup = workspace.foodGroups.find((group) => group.id === search.foodGroupId)
  const hasActiveFilters =
    search.kind !== 'all' ||
    search.foodGroupId !== 'all' ||
    search.brandId !== 'all' ||
    search.restaurantId !== 'all'
  const catalogStats: ReadonlyArray<{
    readonly icon: LucideIcon
    readonly label: string
    readonly value: string
  }> = [
    { icon: Database, label: 'foods', value: formatCompactCount(totalFoods) },
    { icon: Layers3, label: 'groups', value: String(workspace.foodGroups.length) },
    { icon: RefreshCw, label: 'release', value: workspace.releaseId.slice(0, 10) },
  ]

  const selectDataset = (kind: keyof typeof datasetLabels) => {
    updateSearch({
      brandId: kind === 'branded' ? search.brandId : 'all',
      brandName: kind === 'branded' ? search.brandName : '',
      kind,
      restaurantId: kind === 'restaurant' ? search.restaurantId : 'all',
      restaurantName: kind === 'restaurant' ? search.restaurantName : '',
    })
  }

  return (
    <div className="dark min-h-screen bg-[#100e11] font-sans text-foreground">
      <header className="sticky top-0 z-40 flex h-16 items-center border-b border-white/8 bg-[#100e11]/92 px-4 backdrop-blur-xl md:px-6">
        <Link to="/" className="flex items-center gap-3" aria-label="Mons home">
          <span className="text-lg font-semibold tracking-[0.16em] text-white">MONS</span>
          <span className="h-5 w-px bg-white/15" />
          <span className="text-sm text-white/45">Data workspace</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <Badge variant="outline" className="hidden border-white/10 text-white/55 sm:inline-flex">
            {workspace.stage}
          </Badge>
          <span className="flex items-center gap-2 text-xs text-white/45">
            <span className="size-1.5 rounded-full bg-[#b9f35b] shadow-[0_0_12px_#b9f35b]" />
            PostgreSQL live
          </span>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="border-b border-white/8 bg-[#131115] px-4 py-5 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-5">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-white/35 uppercase">
                Catalog
              </p>
              <p className="mt-1 text-sm text-white/70">Food explorer</p>
            </div>
            <div className="grid size-9 place-items-center rounded-xl border border-white/8 bg-white/4 text-[#b9f35b]">
              <Shapes className="size-4" />
            </div>
          </div>

          <section className="mb-7">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-medium text-white/55">Food groups</h2>
              <span className="text-[0.68rem] text-white/30">{workspace.foodGroups.length}</span>
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto pr-1 lg:max-h-[36vh]">
              <button
                type="button"
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ${search.foodGroupId === 'all' ? 'bg-white/9 text-white' : 'text-white/48 hover:bg-white/5 hover:text-white/75'}`}
                onClick={() => updateSearch({ foodGroupId: 'all' })}
              >
                <span>All groups</span>
                <span className="font-mono text-[0.65rem]">{formatCompactCount(totalFoods)}</span>
              </button>
              {workspace.foodGroups.map((group) => (
                <button
                  type="button"
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ${search.foodGroupId === group.id ? 'bg-[#b9f35b] text-[#15200a]' : 'text-white/48 hover:bg-white/5 hover:text-white/75'}`}
                  key={group.id}
                  onClick={() => updateSearch({ foodGroupId: group.id })}
                >
                  <span className="truncate">{group.name}</span>
                  <span className="ml-2 font-mono text-[0.65rem] opacity-65">
                    {formatCompactCount(group.foodCount)}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="border-t border-white/8 pt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-medium text-white/55">Brands</h2>
              {search.brandId !== 'all' && (
                <button
                  className="text-[0.68rem] text-[#b9f35b]"
                  type="button"
                  onClick={() => updateSearch({ brandId: 'all', brandName: '' })}
                >
                  Clear
                </button>
              )}
            </div>
            <CatalogSearchField
              label="Search brands"
              value={search.brandQuery}
              onCommit={(brandQuery) => updateSearch({ brandQuery })}
            />
            {search.brandId !== 'all' && (
              <div className="mb-2 rounded-lg bg-[#b9f35b]/10 px-2.5 py-2 text-xs text-[#d5ff92]">
                {search.brandName}
              </div>
            )}
            <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
              {workspace.brands.map((brand) => (
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs text-white/45 transition hover:bg-white/5 hover:text-white/75"
                  key={brand.id}
                  onClick={() =>
                    updateSearch({
                      brandId: brand.id,
                      brandName: brand.name,
                      kind: 'branded',
                      restaurantId: 'all',
                      restaurantName: '',
                    })
                  }
                >
                  <span className="truncate">{brand.name}</span>
                  <span className="ml-2 font-mono text-[0.65rem] text-white/25">
                    {formatCompactCount(brand.foodCount)}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-6 border-t border-white/8 pt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xs font-medium text-white/55">
                <Building2 className="size-3.5" /> Restaurants
              </h2>
              {search.restaurantId !== 'all' && (
                <button
                  className="text-[0.68rem] text-[#b9f35b]"
                  type="button"
                  onClick={() => updateSearch({ restaurantId: 'all', restaurantName: '' })}
                >
                  Clear
                </button>
              )}
            </div>
            <CatalogSearchField
              label="Search restaurants"
              value={search.restaurantQuery}
              onCommit={(restaurantQuery) => updateSearch({ restaurantQuery })}
            />
            {search.restaurantId !== 'all' && (
              <div className="mb-2 rounded-lg bg-[#b9f35b]/10 px-2.5 py-2 text-xs text-[#d5ff92]">
                {search.restaurantName}
              </div>
            )}
            <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
              {workspace.restaurants.map((restaurant) => (
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs text-white/45 transition hover:bg-white/5 hover:text-white/75"
                  key={restaurant.id}
                  onClick={() =>
                    updateSearch({
                      brandId: 'all',
                      brandName: '',
                      kind: 'restaurant',
                      restaurantId: restaurant.id,
                      restaurantName: restaurant.name,
                    })
                  }
                >
                  <span className="truncate">{restaurant.name}</span>
                  <span className="ml-2 font-mono text-[0.65rem] text-white/25">
                    {formatCompactCount(restaurant.foodCount)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <main className="min-w-0 bg-[#100e11] p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-[96rem]">
            <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs text-[#b9f35b]">
                  <Sparkles className="size-3.5" /> Normalized nutrition catalog
                </div>
                <h1 className="text-3xl font-medium tracking-[-0.035em] text-white md:text-4xl">
                  Know what’s in the data.
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/42">
                  Search every raw, branded, and restaurant food from one normalized table.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:min-w-[28rem]">
                {catalogStats.map(({ icon: Icon, label, value }) => (
                  <div
                    className="rounded-xl border border-white/8 bg-white/3 px-3 py-3"
                    key={label}
                  >
                    <div className="mb-3 flex items-center justify-between text-white/30">
                      <Icon className="size-3.5" />
                      <span className="text-[0.62rem] uppercase">{label}</span>
                    </div>
                    <strong className="block truncate text-sm font-medium text-white">
                      {value}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#171419] shadow-2xl shadow-black/25">
              <div className="flex flex-col gap-3 border-b border-white/8 p-3 md:flex-row md:items-center">
                <CatalogSearchField
                  primary
                  label="Search foods"
                  value={search.q}
                  onCommit={(q) => updateSearch({ q })}
                />
                <div
                  aria-label="Dataset type"
                  className="flex h-10 items-center rounded-lg border border-white/10 bg-white/3 p-1"
                  role="group"
                >
                  {datasetOptions.map((option) => (
                    <button
                      type="button"
                      aria-pressed={search.kind === option.id}
                      className={`h-8 rounded-md px-3 text-xs transition ${search.kind === option.id ? 'bg-white/10 text-white shadow-sm' : 'text-white/42 hover:text-white/75'}`}
                      key={option.id}
                      onClick={() => selectDataset(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div
                role="status"
                className="flex flex-wrap items-center gap-2 border-b border-white/8 px-4 py-3 text-xs text-white/40"
              >
                {isPending && <span>Updating results…</span>}
                <span>
                  {foods.length}
                  {nextOffset === null ? '' : '+'} results
                </span>
                <span className="text-white/15">/</span>
                <span>{search.q === '' ? 'No search entered' : `“${search.q}”`}</span>
                {activeGroup !== undefined && (
                  <Badge variant="outline" className="border-white/10 text-white/55">
                    <Shapes className="size-3" /> {activeGroup.name}
                  </Badge>
                )}
                {search.brandId !== 'all' && (
                  <Badge variant="outline" className="border-white/10 text-white/55">
                    <Tag className="size-3" /> {search.brandName}
                  </Badge>
                )}
                {search.restaurantId !== 'all' && (
                  <Badge variant="outline" className="border-white/10 text-white/55">
                    <Building2 className="size-3" /> {search.restaurantName}
                  </Badge>
                )}
                {hasActiveFilters && (
                  <button
                    type="button"
                    className="ml-auto text-[#b9f35b] transition hover:text-[#d5ff92]"
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
              </div>

              <div
                ref={resultsScrollRef}
                aria-busy={isPending}
                aria-label="Scrollable food results"
                className="max-h-[68vh] overflow-auto overscroll-contain [&>[data-slot=table-container]]:overflow-visible"
              >
                <Table aria-label="Food catalog results" className="table-fixed min-w-[72rem]">
                  <TableHeader className="sticky top-0 z-10 bg-[#19161b] shadow-[0_1px_0_rgba(255,255,255,0.08)]">
                    <TableHead isRowHeader className="w-[31%] px-4 text-xs text-white/38">
                      Food
                    </TableHead>
                    <TableHead className="w-[19%] text-xs text-white/38">Source</TableHead>
                    <TableHead className="w-[18%] text-xs text-white/38">Group</TableHead>
                    <TableHead className="text-right text-xs text-white/38">Protein</TableHead>
                    <TableHead className="text-right text-xs text-white/38">Fat</TableHead>
                    <TableHead className="pr-4 text-right text-xs text-white/38">Carbs</TableHead>
                  </TableHeader>
                  <TableBody items={foods}>
                    {(food) => (
                      <TableRow
                        id={`${food.datasetKind}:${food.foodId}`}
                        className="border-white/7"
                      >
                        <TableCell className="px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/6 bg-white/5 text-white/35">
                              <DatasetIcon kind={food.datasetKind} />
                            </div>
                            <FoodDetailsSheet food={food} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <CatalogSourceBadge source={food.source} />
                            <span className="block text-[0.65rem] text-white/28">
                              {datasetLabels[food.datasetKind]}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="border-white/8 text-white/55">
                              {food.foodGroup}
                            </Badge>
                            {food.foodSubgroup === null ? null : (
                              <span className="text-[0.68rem] text-white/32">
                                {food.foodSubgroup}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-white/75">
                          {formatFoodNutrient(food, food.protein)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-white/75">
                          {formatFoodNutrient(food, food.totalFat)}
                        </TableCell>
                        <TableCell className="pr-4 text-right font-mono text-xs text-white/75">
                          {formatFoodNutrient(food, food.carbohydrates)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {foods.length === 0 && (
                  <div className="grid min-h-64 place-items-center p-8 text-center">
                    <div>
                      <Search className="mx-auto mb-3 size-5 text-white/25" />
                      <p className="text-sm text-white/60">
                        {search.q === '' ? 'Search the food catalog' : 'No matching foods'}
                      </p>
                      <p className="mt-1 text-xs text-white/30">
                        {search.q === ''
                          ? 'Enter at least 2 characters to find foods.'
                          : 'Try a broader term or clear a filter.'}
                      </p>
                    </div>
                  </div>
                )}

                {foods.length > 0 && (
                  <div
                    ref={loadMoreRef}
                    className="flex min-h-16 items-center justify-center border-t border-white/7 px-4 py-3"
                  >
                    {status === 'error' ? (
                      <button
                        type="button"
                        className="text-xs text-[#b9f35b] transition hover:text-[#d5ff92]"
                        onClick={() => void loadMore()}
                      >
                        Couldn’t load more. Retry
                      </button>
                    ) : status === 'loading' ? (
                      <span className="flex items-center gap-2 text-xs text-white/38">
                        <span className="size-1.5 animate-pulse rounded-full bg-[#b9f35b]" />
                        Loading more foods…
                      </span>
                    ) : nextOffset === null ? (
                      <span className="text-xs text-white/28">End of results</span>
                    ) : (
                      <button
                        type="button"
                        className="text-xs text-white/42 transition hover:text-white/75"
                        onClick={() => void loadMore()}
                      >
                        Load more
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
