import { createFileRoute, useRouterState } from '@tanstack/react-router'

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
  const { search, workspace } = Route.useLoaderData()
  const isPending = useRouterState({ select: (state) => state.isLoading })
  const navigate = Route.useNavigate()

  return (
    <FoodExplorerPage
      search={search}
      workspace={workspace}
      isPending={isPending}
      updateSearch={(next) =>
        void navigate({
          search: (current) =>
            typeof next === 'function' ? next(current) : { ...current, ...next },
          replace: true,
          resetScroll: false,
        })
      }
    />
  )
}
