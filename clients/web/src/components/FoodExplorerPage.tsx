import { ThemeToggle } from './ThemeToggle'
import { useLayoutEffect, useRef, useState } from 'react'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { catalogColumns } from '~/features/catalog/catalog-columns'
import { datasetKindLabel, isCatalogSort } from '~/features/catalog/catalog-search'
import { Link } from '@tanstack/react-router'
import { Collection, Table, TableLoadMoreItem } from 'react-aria-components'
import { Virtualizer } from 'react-aria-components/Virtualizer'
import { CatalogTableLayout } from '~/features/catalog/catalog-table-layout'
import type { CatalogSearch, CatalogSearchUpdate } from '~/features/catalog/catalog-search'
import type { getCatalogWorkspace } from '~/features/catalog/catalog-functions'
import { useCatalogPages } from '~/features/catalog/use-catalog-pages'
import { useColumnFilter } from '~/features/catalog/use-column-filter'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { ArrowDown, ArrowUp, ArrowUpDown, Filter, X } from 'lucide-react'
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
  const filter = useColumnFilter()
  const { column: openColumn, triggerRef } = filter
  const searchKey = JSON.stringify(search)
  // Keep the menu anchor mounted while editing; reset the table after dismissal.
  const [tableKey, setTableKey] = useState(searchKey)
  const restoreFilterFocus = useRef<string | null>(null)
  useLayoutEffect(() => {
    if (openColumn === null && tableKey !== searchKey) {
      restoreFilterFocus.current =
        document.activeElement?.getAttribute('data-catalog-filter-trigger') ?? null
      setTableKey(searchKey)
    } else if (restoreFilterFocus.current) {
      const id = restoreFilterFocus.current
      restoreFilterFocus.current = null
      if (['food', 'source', 'group'].includes(id)) {
        document
          .querySelector<HTMLElement>(`[data-catalog-filter-trigger="${id}"]`)
          ?.focus({ preventScroll: true })
      }
    }
  }, [openColumn, searchKey, tableKey])
  const table = useReactTable({
    data: foods,
    columns: catalogColumns,
    getRowId: (food) => `${food.datasetKind}:${food.foodId}`,
    getCoreRowModel: getCoreRowModel(),
    manualFiltering: true,
    manualSorting: true,
    state: { sorting: search.sort ? [{ id: search.sort, desc: search.direction === 'desc' }] : [] },
    onSortingChange: (update) => {
      const next = typeof update === 'function' ? update(table.getState().sorting) : update
      const first = next[0]
      updateSearch({
        sort: first && isCatalogSort(first.id) ? first.id : '',
        direction: first?.desc ? 'desc' : 'asc',
      })
    },
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
    { key: 'groups', label: 'Category' },
    { key: 'sources', label: 'Source' },
    { key: 'subgroups', label: 'Subcategory' },
    { key: 'brands', label: 'Brand' },
    { key: 'restaurants', label: 'Restaurant' },
  ]
  return (
    <div className="catalog-shell">
      <header className="catalog-header">
        <Link to="/" aria-label="Mons home" className="text-sm font-semibold tracking-wide">
          MONS
        </Link>
        <h1 className="border-l border-border pl-4 text-sm text-muted-foreground">Foods</h1>
        <span className="ml-auto text-xs text-muted-foreground">{workspace.stage}</span>
        <ThemeToggle />
      </header>
      <div className="catalog-layout">
        <main className="catalog-main">
          <div className="w-full max-w-xl px-3 pb-5">
            <CatalogSearchField
              primary
              label="Search foods"
              value={search.q}
              onCommit={(q) => updateSearch({ q })}
            />
          </div>
          {hasActiveFilters && (
            <section
              aria-label="Active filters"
              className="flex max-h-36 shrink-0 flex-wrap items-center gap-2 overflow-y-auto border-b border-border p-3 text-xs"
            >
              <span className="mr-1 text-muted-foreground">Filters</span>
              {search.kinds.map((kind) => (
                <Button
                  variant="outline"
                  size="xs"
                  key={kind}
                  type="button"
                  aria-label={`Remove type: ${kind}`}
                  onPress={() =>
                    updateSearch((current) => ({
                      ...current,
                      kinds: current.kinds.filter((value) => value !== kind),
                    }))
                  }
                >
                  Type: {datasetKindLabel[kind]} <X data-icon="inline-end" />
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
                    onPress={() =>
                      updateSearch((current) => ({
                        ...current,
                        [key]: current[key].filter((value) => value.id !== item.id),
                      }))
                    }
                  >
                    {label}: {item.name} <X data-icon="inline-end" />
                  </Button>
                )),
              )}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="xs"
                  type="button"
                  className="ml-auto"
                  onPress={() =>
                    updateSearch((current) => ({
                      ...parseCatalogSearch({}),
                      q: current.q,
                      sort: current.sort,
                      direction: current.direction,
                      brandQuery: current.brandQuery,
                      restaurantQuery: current.restaurantQuery,
                    }))
                  }
                >
                  Clear filters
                </Button>
              )}
            </section>
          )}
          <div role="status" className="catalog-results-status">
            <span>
              {isPending
                ? 'Updating results…'
                : `${foods.length}${nextOffset === null ? '' : '+'} results`}
            </span>
            <span>{search.q === '' ? 'All foods' : `“${search.q}”`}</span>
            <span className="ml-auto text-muted-foreground">
              Per portion · basis when unavailable
            </span>
          </div>
          <Virtualizer
            layout={CatalogTableLayout}
            layoutOptions={{ rowHeight: 96, headingHeight: 42, loaderHeight: 48 }}
          >
            <Table
              key={tableKey}
              onSortChange={(descriptor) =>
                table.setSorting([
                  { id: String(descriptor.column), desc: descriptor.direction === 'descending' },
                ])
              }
              {...(search.sort
                ? {
                    sortDescriptor: {
                      column: search.sort,
                      direction: search.direction === 'desc' ? 'descending' : 'ascending',
                    },
                  }
                : {})}
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
                    allowsSorting
                    width={header.getSize()}
                  >
                    <div className="flex items-center gap-1">
                      <Button
                        size="xs"
                        variant="ghost"
                        className="min-w-0 max-w-full"
                        aria-label={`Sort by ${header.column.columnDef.header}`}
                        onPress={() => {
                          const current = header.column.getIsSorted()
                          table.setSorting(
                            current === 'desc' ? [] : [{ id: header.id, desc: current === 'asc' }],
                          )
                        }}
                      >
                        <span
                          className="truncate"
                          title={
                            typeof header.column.columnDef.header === 'string'
                              ? header.column.columnDef.header
                              : header.id
                          }
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {header.column.getIsSorted() === 'asc' ? (
                          <ArrowUp data-icon="inline-end" />
                        ) : header.column.getIsSorted() === 'desc' ? (
                          <ArrowDown data-icon="inline-end" />
                        ) : (
                          <ArrowUpDown data-icon="inline-end" />
                        )}
                      </Button>
                      {['food', 'source', 'group'].includes(header.id) ? (
                        <Button
                          ref={(element) => {
                            if (element && openColumn === header.id) triggerRef.current = element
                          }}
                          size="xs"
                          variant="ghost"
                          aria-label={`Filter ${header.id === 'group' ? 'category' : header.id}`}
                          aria-haspopup="dialog"
                          data-catalog-filter-trigger={header.id}
                          aria-expanded={openColumn === header.id}
                          onHoverStart={(event) => {
                            if (event.target instanceof HTMLElement)
                              filter.hover(header.id, event.target)
                          }}
                          onHoverEnd={filter.leave}
                          onPress={(event) => {
                            if (!(event.target instanceof HTMLElement)) return
                            filter.open(header.id, event.target)
                          }}
                        >
                          <Filter data-icon="inline-end" />
                          {filterCount(header.id, search) > 0 && (
                            <Badge variant="secondary">{filterCount(header.id, search)}</Badge>
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </TableHead>
                ))}
              </TableHeader>
              <TableBody
                renderEmptyState={() => (
                  <div className="p-8 text-sm text-muted-foreground">
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
                    className="p-4 text-xs text-muted-foreground"
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
              popoverRef={filter.popoverRef}
              onPointerEnter={filter.cancel}
              onPointerLeave={filter.leave}
              isOpen
              onOpenChange={(open) => {
                if (!open) filter.close()
              }}
              column={openColumn}
              label={
                openColumn === 'group'
                  ? 'Category'
                  : openColumn[0]?.toUpperCase() + openColumn.slice(1)
              }
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
              className="p-3 text-xs text-warning"
              onPress={() => void loadMore()}
            >
              Couldn’t load more. Retry
            </Button>
          )}
          {nextOffset === null && foods.length > 0 && (
            <p className="p-2 text-center text-[10px] text-muted-foreground">End of results</p>
          )}
        </main>
      </div>
    </div>
  )
}
