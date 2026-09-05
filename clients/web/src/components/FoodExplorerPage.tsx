import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { catalogColumns } from '~/features/catalog/catalog-columns'
import { Link } from '@tanstack/react-router'
import { Collection, Table, TableLoadMoreItem } from 'react-aria-components'
import { Virtualizer } from 'react-aria-components/Virtualizer'
import { CatalogTableLayout } from '~/features/catalog/catalog-table-layout'
import type { CatalogSearch, CatalogSearchUpdate } from '~/features/catalog/catalog-search'
import type { getCatalogWorkspace } from '~/features/catalog/catalog-functions'
import { useCatalogPages } from '~/features/catalog/use-catalog-pages'
import { useRef, useState } from 'react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Filter } from 'lucide-react'
import { CatalogColumnFilter, filterCount } from './CatalogColumnFilter'
import { CatalogSearchField } from './CatalogSearchField'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

import { parseCatalogSearch } from '~/features/catalog/catalog-search'

type Workspace = Awaited<ReturnType<typeof getCatalogWorkspace>>
interface FoodExplorerPageProps {
  readonly isPending: boolean
  readonly search: CatalogSearch
  readonly workspace: Workspace
  readonly updateSearch: (next: CatalogSearchUpdate) => void
}
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
  const triggerRef = useRef<HTMLElement | null>(null)
  const [openColumn, setOpenColumn] = useState<string | null>(null)
  const searchKey = JSON.stringify(search)
  const table = useReactTable({
    data: foods,
    columns: catalogColumns,
    getRowId: (food) => `${food.datasetKind}:${food.foodId}`,
    getCoreRowModel: getCoreRowModel(),
    manualFiltering: true,
    manualPagination: true,
    autoResetPageIndex: false,
  })
  const updateSearch = (next: CatalogSearchUpdate) => {
    const candidate = typeof next === 'function' ? next(search) : { ...search, ...next }
    if (JSON.stringify(candidate) === JSON.stringify(search)) return
    invalidate()
    navigate(next)
  }
  const hasActiveFilters =
    search.kinds.length +
      search.sources.length +
      search.subgroups.length +
      search.groups.length +
      search.brands.length +
      search.restaurants.length >
    0
  const facets: ReadonlyArray<{
    key: 'groups' | 'brands' | 'restaurants' | 'sources' | 'subgroups'
    label: string
  }> = [
    { key: 'groups', label: 'Group' },
    { key: 'sources', label: 'Source' },
    { key: 'subgroups', label: 'Subtype' },
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
              <Button
                variant="outline"
                size="xs"
                key={kind}
                type="button"
                aria-label={`Remove type: ${kind}`}
                className="rounded border border-white/15 bg-white/5 px-2 py-1"
                onPress={() =>
                  updateSearch((current) => ({
                    ...current,
                    kinds: current.kinds.filter((value) => value !== kind),
                  }))
                }
              >
                Type: {kind} <span aria-hidden="true">×</span>
              </Button>
            ))}
            {facets.flatMap(({ key, label }) =>
              search[key].map((item) => (
                <Button
                  variant="outline"
                  size="xs"
                  key={`${key}:${item.id}`}
                  type="button"
                  aria-label={`Remove ${label.toLowerCase()}: ${item.name}`}
                  className="rounded border border-white/15 bg-white/5 px-2 py-1"
                  onPress={() =>
                    updateSearch((current) => ({
                      ...current,
                      [key]: current[key].filter((value) => value.id !== item.id),
                    }))
                  }
                >
                  {label}: {item.name} <span aria-hidden="true">×</span>
                </Button>
              )),
            )}
            {!hasActiveFilters && <span className="text-white/35">None · showing all foods</span>}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="xs"
                type="button"
                className="ml-auto text-lime-200"
                onPress={() =>
                  updateSearch((current) => ({
                    ...parseCatalogSearch({}),
                    q: current.q,
                    brandQuery: current.brandQuery,
                    restaurantQuery: current.restaurantQuery,
                  }))
                }
              >
                Clear filters
              </Button>
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
            layout={CatalogTableLayout}
            layoutOptions={{ rowHeight: 76, headingHeight: 38, loaderHeight: 48 }}
          >
            <Table
              key={searchKey}
              aria-label="Food catalog results"
              aria-busy={isPending}
              className="catalog-table"
              data-loaded-count={foods.length}
              onScroll={({ currentTarget }) => {
                // The load sentinel can be outside the horizontal viewport.
                if (
                  !isPending &&
                  status === 'idle' &&
                  currentTarget.scrollHeight -
                    currentTarget.scrollTop -
                    currentTarget.clientHeight <
                    240
                )
                  void loadMore()
              }}
            >
              <TableHeader>
                {table.getFlatHeaders().map((header) => (
                  <TableHead
                    key={header.id}
                    id={header.id}
                    isRowHeader={header.id === 'food'}
                    width={header.getSize()}
                  >
                    {['food', 'source', 'group'].includes(header.id) ? (
                      <Button
                        ref={(element) => {
                          if (element && openColumn === header.id) triggerRef.current = element
                        }}
                        size="xs"
                        variant="ghost"
                        aria-label={`Filter ${header.id}`}
                        aria-haspopup="dialog"
                        aria-expanded={openColumn === header.id}
                        onPress={(event) => {
                          if (!(event.target instanceof HTMLElement)) return
                          triggerRef.current = event.target
                          setOpenColumn(header.id)
                        }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <Filter className="size-3" />
                        {filterCount(header.id, search) > 0 && (
                          <Badge variant="secondary">{filterCount(header.id, search)}</Badge>
                        )}
                      </Button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
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
                <Collection items={table.getRowModel().rows}>
                  {(row) => (
                    <TableRow id={row.id} textValue={row.original.name}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
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
          {openColumn !== null && (
            <CatalogColumnFilter
              key={openColumn}
              triggerRef={triggerRef}
              isOpen
              onOpenChange={(open) => {
                if (!open) setOpenColumn(null)
              }}
              column={openColumn}
              label={openColumn[0]?.toUpperCase() + openColumn.slice(1)}
              search={search}
              workspace={workspace}
              updateSearch={updateSearch}
            />
          )}
          {status === 'error' && (
            <Button
              variant="outline"
              size="xs"
              type="button"
              className="p-3 text-xs text-amber-300"
              onPress={() => void loadMore()}
            >
              Couldn’t load more. Retry
            </Button>
          )}
          {nextOffset === null && foods.length > 0 && (
            <p className="p-2 text-center text-[10px] text-white/35">End of results</p>
          )}
        </main>
      </div>
    </div>
  )
}
