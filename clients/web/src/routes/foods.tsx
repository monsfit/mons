import { createFileRoute } from '@tanstack/react-router'

import { FoodExplorerPage } from '~/components/FoodExplorerPage'
import { getCatalogWorkspace } from '~/features/catalog/catalog-functions'
import { parseCatalogSearch } from '~/features/catalog/catalog-search'

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
  loader: ({ deps }) =>
    getCatalogWorkspace({
      data: {
        q: deps.q,
        ...(deps.brandId === 'all' ? {} : { brandId: deps.brandId }),
        ...(deps.brandQuery.length === 0 ? {} : { brandQuery: deps.brandQuery }),
        ...(deps.foodGroupId === 'all' ? {} : { foodGroupId: deps.foodGroupId }),
        ...(deps.kind === 'all' ? {} : { kind: deps.kind }),
      },
    }),
  pendingComponent: FoodExplorerPending,
})

function FoodsRoute() {
  const search = Route.useSearch()
  const workspace = Route.useLoaderData()
  const navigate = Route.useNavigate()

  return (
    <FoodExplorerPage
      search={search}
      workspace={workspace}
      updateSearch={(next) => void navigate({ search: next })}
    />
  )
}

function FoodExplorerPending() {
  return (
    <div className="dark grid min-h-screen place-items-center bg-[#100e11] text-white">
      <div className="flex items-center gap-3 text-sm text-white/55">
        <span className="size-2 animate-pulse rounded-full bg-[#b9f35b]" />
        Reading the catalog…
      </div>
    </div>
  )
}
