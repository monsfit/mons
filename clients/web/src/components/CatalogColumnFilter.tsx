import { useState, type RefObject } from 'react'
import { CircleHelp } from 'lucide-react'
import { Dialog } from 'react-aria-components'
import { getCatalogSource } from '~/features/catalog/catalog-sources'
import { datasetKindLabel } from '~/features/catalog/catalog-search'
import { Button } from './ui/button'
import { Popover, PopoverTitle, PopoverTrigger } from './ui/popover'
import { CatalogSearchField } from './CatalogSearchField'
import { CatalogFacetList } from './CatalogFacetList'
import {
  toggleFilter,
  type CatalogSearch,
  type CatalogSearchUpdate,
} from '~/features/catalog/catalog-search'
import type { getCatalogWorkspace } from '~/features/catalog/catalog-functions'

type Workspace = Awaited<ReturnType<typeof getCatalogWorkspace>>
type Facet = 'brands' | 'restaurants' | 'groups' | 'subgroups' | 'sources'
const labels = {
  brands: 'Brands',
  restaurants: 'Restaurants',
  groups: 'Categories',
  subgroups: 'Subcategories',
  sources: 'Data sources',
}
const facets: Record<string, Facet[]> = {
  food: ['brands', 'restaurants'],
  source: ['sources'],
  group: ['groups', 'subgroups'],
}

function Picker({
  facet,
  search,
  workspace,
  updateSearch,
}: {
  facet: Facet
  search: CatalogSearch
  workspace: Workspace
  updateSearch: (next: CatalogSearchUpdate) => void
}) {
  const [localQuery, setLocalQuery] = useState('')
  const remote = facet === 'brands' || facet === 'restaurants'
  const query =
    facet === 'brands'
      ? search.brandQuery
      : facet === 'restaurants'
        ? search.restaurantQuery
        : localQuery
  const loadedQuery =
    facet === 'brands'
      ? workspace.brandQuery
      : facet === 'restaurants'
        ? workspace.restaurantQuery
        : localQuery
  const items = facet === 'groups' ? workspace.foodGroups : workspace[facet]
  const visibleItems = remote
    ? items
    : items.filter((item) => {
        const metadata = facet === 'sources' ? getCatalogSource(item.name) : undefined
        return [item.name, metadata?.abbreviation, metadata?.fullName].some((name) =>
          name?.toLowerCase().includes(localQuery.toLowerCase()),
        )
      })
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs font-medium">
        <div className="flex items-center gap-1">
          <h3>{labels[facet]}</h3>
          {facet === 'sources' && (
            <PopoverTrigger>
              <Button variant="ghost" size="icon-xs" aria-label="Explain source abbreviations">
                <CircleHelp />
              </Button>
              <Popover className="max-h-96 overflow-y-auto">
                <Dialog
                  aria-label="Source abbreviations"
                  className="flex flex-col gap-3 outline-none"
                >
                  <PopoverTitle>Source names</PopoverTitle>
                  <dl className="flex flex-col gap-3">
                    {items.map((item) => {
                      const metadata = getCatalogSource(item.name)
                      return (
                        <div key={item.id}>
                          <dt className="text-xs font-medium">
                            {metadata.abbreviation ?? metadata.label}
                          </dt>
                          <dd className="text-xs text-muted-foreground">
                            {metadata.fullName ?? metadata.label}
                          </dd>
                        </div>
                      )
                    })}
                  </dl>
                </Dialog>
              </Popover>
            </PopoverTrigger>
          )}
        </div>
        <Button variant="ghost" size="xs" onPress={() => updateSearch({ [facet]: [] })}>
          Clear {labels[facet].toLowerCase()}
        </Button>
      </div>
      <CatalogSearchField
        label={`Search ${labels[facet].toLowerCase()}`}
        value={query}
        onCommit={(value) => {
          if (facet === 'brands') updateSearch({ brandQuery: value })
          else if (facet === 'restaurants') updateSearch({ restaurantQuery: value })
          else setLocalQuery(value)
        }}
      />
      <CatalogFacetList
        key={`${workspace.releaseId}:${loadedQuery}`}
        label={labels[facet]}
        items={visibleItems}
        displayName={
          facet === 'sources' ? (name) => getCatalogSource(name).abbreviation ?? name : undefined
        }
        {...(remote
          ? {
              kind: facet,
              query: loadedQuery,
              nextOffset:
                facet === 'brands' ? workspace.brandNextOffset : workspace.restaurantNextOffset,
            }
          : {})}
        selectedIds={search[facet].map((item) => item.id)}
        onSelect={(item) =>
          updateSearch((current) => ({ ...current, [facet]: toggleFilter(current[facet], item) }))
        }
      />
    </section>
  )
}

export function CatalogColumnFilter({
  triggerRef,
  popoverRef,
  onPointerEnter,
  onPointerLeave,
  isOpen,
  onOpenChange: setOpen,
  column,
  label,
  search,
  workspace,
  updateSearch,
}: {
  triggerRef: RefObject<HTMLElement | null>
  popoverRef: RefObject<HTMLDivElement | null>
  onPointerEnter: () => void
  onPointerLeave: () => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  column: string
  label: string
  search: CatalogSearch
  workspace: Workspace
  updateSearch: (next: CatalogSearchUpdate) => void
}) {
  const columns = facets[column]
  if (!columns) return label
  return (
    <Popover
      ref={popoverRef}
      isNonModal
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      triggerRef={triggerRef}
      isOpen={isOpen}
      onOpenChange={setOpen}
      placement="bottom start"
      className="w-80 max-h-[min(720px,80dvh)] overflow-y-auto"
    >
      <div
        role="dialog"
        tabIndex={-1}
        aria-label={`${label} filters`}
        className="flex flex-col gap-4 outline-none"
      >
        <div
          className="flex flex-col gap-4"
          onKeyDownCapture={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest('[role="dialog"]') !==
                event.currentTarget.closest('[role="dialog"]')
            )
              return
            if (event.key === 'Escape') {
              event.stopPropagation()
              setOpen(false)
            }
          }}
        >
          <PopoverTitle>{label} filters</PopoverTitle>
          {column === 'group' && (
            <p className="text-xs text-muted-foreground">
              Choose a broad category or narrow by subcategory.
            </p>
          )}
          {column === 'source' && (
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium">Type</h3>
              <div className="flex gap-1" role="group" aria-label="Dataset type">
                <Button
                  size="xs"
                  variant={search.kinds.length === 0 ? 'secondary' : 'ghost'}
                  aria-pressed={search.kinds.length === 0}
                  onPress={() => updateSearch({ kinds: [] })}
                >
                  All
                </Button>
                {(['raw', 'branded', 'restaurant'] satisfies CatalogSearch['kinds']).map((kind) => (
                  <Button
                    key={kind}
                    size="xs"
                    variant={search.kinds.includes(kind) ? 'secondary' : 'ghost'}
                    aria-pressed={search.kinds.includes(kind)}
                    onPress={() =>
                      updateSearch((current) => ({
                        ...current,
                        kinds: current.kinds.includes(kind)
                          ? current.kinds.filter((value) => value !== kind)
                          : [...current.kinds, kind],
                      }))
                    }
                  >
                    {datasetKindLabel[kind]}
                  </Button>
                ))}
              </div>
            </section>
          )}
          {columns.map((facet) => (
            <Picker
              key={facet}
              facet={facet}
              search={search}
              workspace={workspace}
              updateSearch={updateSearch}
            />
          ))}
          <p className="text-[10px] text-muted-foreground">
            Match any within a filter; match all across filters. Counts cover the whole catalog,
            before your other filters.
          </p>
        </div>
      </div>
    </Popover>
  )
}

export function filterCount(column: string, search: CatalogSearch) {
  return (facets[column] ?? []).reduce(
    (sum, facet) => sum + search[facet].length,
    column === 'source' ? search.kinds.length : 0,
  )
}
