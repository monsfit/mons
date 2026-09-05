import { createFileRoute, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState, useTransition } from 'react'

import { FoodExplorerPage } from '~/components/FoodExplorerPage'
import { getCatalogWorkspace } from '~/features/catalog/catalog-functions'
import { parseCatalogSearch, toCatalogQuery } from '~/features/catalog/catalog-search'

export const Route = createFileRoute('/foods')({
  component: FoodsRoute,
  head: () => ({
    meta: [
      { content: 'Explore the normalized Mons nutrition catalog.', name: 'description' },
      { title: 'Food data — Mons' },
    ],
  }),
  validateSearch: parseCatalogSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => ({
    search: deps,
    workspace: await getCatalogWorkspace({ data: toCatalogQuery(deps) }),
  }),
})

function FoodsRoute() {
  const { search: loadedSearch, workspace } = Route.useLoaderData()
  const [search, selectFilters] = useState(loadedSearch)
  const selection = useRef(loadedSearch)
  const [isSelecting, startSelection] = useTransition()
  const isPending = useRouterState({ select: (state) => state.isLoading })
  const navigate = Route.useNavigate()
  useEffect(() => {
    if (!isPending && !isSelecting) {
      selection.current = loadedSearch
      selectFilters(loadedSearch)
    }
  }, [loadedSearch, isPending, isSelecting])

  return (
    <FoodExplorerPage
      search={search}
      workspace={workspace}
      isPending={isPending || isSelecting}
      updateSearch={(next) => {
        const current = selection.current
        const updated = typeof next === 'function' ? next(current) : { ...current, ...next }
        selection.current = updated
        selectFilters(updated)
        startSelection(async () => {
          await navigate({
            search: updated,
            replace: true,
            resetScroll: false,
          })
        })
      }}
    />
  )
}
