import { useEffect, useRef, useState } from 'react'
import { Collection, ListBox, ListBoxItem, ListBoxLoadMoreItem } from 'react-aria-components'
import { ListLayout, Virtualizer } from 'react-aria-components/Virtualizer'
import { getCatalogFacetPage } from '~/features/catalog/catalog-functions'
import { formatCompactCount } from '~/features/catalog/catalog-search'

interface FacetItem {
  readonly id: string
  readonly name: string
  readonly foodCount: number
}

interface CatalogFacetListProps {
  readonly label: string
  readonly items: ReadonlyArray<FacetItem>
  readonly selectedIds: ReadonlyArray<string>
  readonly onSelect: (item: FacetItem) => void
  readonly kind?: 'brands' | 'restaurants'
  readonly query?: string
  readonly nextOffset?: number | null
}

export function CatalogFacetList({
  label,
  items,
  selectedIds,
  onSelect,
  kind,
  query = '',
  nextOffset = null,
}: CatalogFacetListProps) {
  const [page, setPage] = useState(() =>
    kind === undefined
      ? { items: items.slice(0, 30), nextOffset: items.length > 30 ? 30 : null }
      : { items, nextOffset },
  )
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const generation = useRef(0)
  const busy = useRef(false)
  useEffect(() => {
    busy.current = false
    return () => {
      generation.current += 1
      busy.current = true
    }
  }, [])

  async function loadMore() {
    if (busy.current || page.nextOffset === null) return
    if (kind === undefined) {
      const end = page.nextOffset + 30
      setPage({ items: items.slice(0, end), nextOffset: items.length > end ? end : null })
      return
    }
    busy.current = true
    const request = generation.current
    setStatus('loading')
    try {
      const next = await getCatalogFacetPage({ data: { kind, query, offset: page.nextOffset } })
      if (request !== generation.current) return
      setPage((current) => {
        const ids = new Set(current.items.map((item) => item.id))
        return {
          items: [...current.items, ...next.items.filter((item) => !ids.has(item.id))],
          nextOffset: next.nextOffset,
        }
      })
      setStatus('idle')
    } catch {
      if (request === generation.current) setStatus('error')
    } finally {
      if (request === generation.current) busy.current = false
    }
  }

  return (
    <div>
      <Virtualizer layout={ListLayout} layoutOptions={{ rowSize: 34, loaderSize: 34 }}>
        <ListBox
          aria-label={label}
          data-loaded-count={page.items.length}
          className="catalog-facet-list"
          onScroll={({ currentTarget }) => {
            if (
              status === 'idle' &&
              currentTarget.scrollHeight - currentTarget.scrollTop - currentTarget.clientHeight <
                100
            )
              void loadMore()
          }}
          selectionMode="multiple"
          escapeKeyBehavior="none"
          selectionBehavior="toggle"
          selectedKeys={selectedIds}
          onSelectionChange={(selection) => {
            if (selection === 'all') return
            const id =
              [...selection].find((key) => !selectedIds.includes(String(key))) ??
              selectedIds.find((key) => !selection.has(key))
            const item = page.items.find((candidate) => candidate.id === id)
            if (item !== undefined) onSelect(item)
          }}
          renderEmptyState={() => (
            <span className="p-2 text-xs text-white/45">No results found</span>
          )}
        >
          <Collection items={page.items}>
            {(item) => (
              <ListBoxItem id={item.id} textValue={item.name} className="catalog-facet-item">
                <span className="min-w-0 truncate">{item.name}</span>
                <span className="text-[10px] text-white/45">
                  {formatCompactCount(item.foodCount)}
                </span>
              </ListBoxItem>
            )}
          </Collection>
          {page.nextOffset !== null && status !== 'error' && (
            <ListBoxLoadMoreItem
              onLoadMore={() => void loadMore()}
              isLoading={status === 'loading'}
              className="p-2 text-xs text-white/40"
            >
              Loading more…
            </ListBoxLoadMoreItem>
          )}
        </ListBox>
      </Virtualizer>
      {status === 'error' && (
        <button
          type="button"
          className="py-2 text-xs text-amber-300"
          onClick={() => void loadMore()}
        >
          Couldn’t load more. Retry
        </button>
      )}
    </div>
  )
}
