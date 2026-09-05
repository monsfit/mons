import { createFileRoute, notFound, Link } from '@tanstack/react-router'
import { getCatalogFood } from '~/features/catalog/catalog-functions'
import { isCatalogId, parseCatalogSearch } from '~/features/catalog/catalog-search'
import { FoodNutritionPage } from '~/components/FoodNutritionPage'

export const Route = createFileRoute('/food/$kind/$foodId')({
  loader: async ({ params }) => {
    const { kind, foodId } = params
    if ((kind !== 'raw' && kind !== 'branded' && kind !== 'restaurant') || !isCatalogId(foodId))
      throw notFound()
    const food = await getCatalogFood({ data: { kind, foodId } })
    if (food === null) throw notFound()
    return food
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.name ?? 'Food'} — Mons` }] }),
  component: FoodRoute,
  notFoundComponent: () => (
    <main className="p-10">
      <h1>Food not found</h1>
      <Link to="/foods" search={parseCatalogSearch({ q: '' })}>
        Back to foods
      </Link>
    </main>
  ),
})

function FoodRoute() {
  const food = Route.useLoaderData()
  return <FoodNutritionPage key={food.food_id} food={food} />
}
