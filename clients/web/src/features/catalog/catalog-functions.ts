import { env } from 'cloudflare:workers'
import { createServerFn } from '@tanstack/react-start'
import {
  CatalogReader,
  catalogReaderLayer,
  createDatabaseLayer,
  type FoodSearchRecord,
} from '@mons/database'
import { Effect, Layer, Schema } from 'effect'

export const CATALOG_PAGE_SIZE = 50

const catalogIdSchema = Schema.String.check(Schema.isPattern(/^\d{1,19}$/))
const catalogSearchTextSchema = Schema.String.check(Schema.isMinLength(2), Schema.isMaxLength(200))
const catalogFilterTextSchema = Schema.String.check(Schema.isMaxLength(160))
const catalogOffsetSchema = Schema.Number.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: 1_000_000, minimum: 0 }),
)

const catalogQuerySchema = Schema.Struct({
  brandId: Schema.optionalKey(catalogIdSchema),
  brandQuery: Schema.optionalKey(catalogFilterTextSchema),
  foodGroupId: Schema.optionalKey(catalogIdSchema),
  kind: Schema.optionalKey(Schema.Literals(['raw', 'branded', 'restaurant'])),
  q: catalogSearchTextSchema,
  restaurantId: Schema.optionalKey(catalogIdSchema),
  restaurantQuery: Schema.optionalKey(catalogFilterTextSchema),
})
const catalogPageQuerySchema = Schema.Struct({
  ...catalogQuerySchema.fields,
  offset: catalogOffsetSchema,
})

const decodeCatalogQuery = Schema.decodeUnknownSync(catalogQuerySchema)
const decodeCatalogPageQuery = Schema.decodeUnknownSync(catalogPageQuerySchema)

export interface CatalogFood {
  readonly brand: string | null
  readonly brandId: string | null
  readonly calories: number | null
  readonly carbohydrates: number | null
  readonly datasetKind: 'raw' | 'branded' | 'restaurant'
  readonly defaultPortion: FoodSearchRecord['default_portion']
  readonly foodGroup: string
  readonly foodGroupId: string
  readonly foodSubgroup: string | null
  readonly foodSubgroupId: string | null
  readonly foodId: string
  readonly name: string
  readonly nutrientBasis: FoodSearchRecord['nutrient_basis']
  readonly protein: number | null
  readonly restaurant: string | null
  readonly restaurantId: string | null
  readonly source: string
  readonly sourceId: string
  readonly totalFat: number | null
}

const toCatalogFood = (food: FoodSearchRecord): CatalogFood => ({
  brand: food.brand,
  brandId: food.brand_id,
  calories: food.calories,
  carbohydrates: food.carbohydrates_total,
  datasetKind: food.dataset_kind,
  defaultPortion: food.default_portion,
  foodGroup: food.food_group,
  foodGroupId: food.food_group_id,
  foodSubgroup: food.food_subgroup,
  foodSubgroupId: food.food_subgroup_id,
  foodId: food.food_id,
  name: food.name,
  nutrientBasis: food.nutrient_basis,
  protein: food.protein,
  restaurant: food.restaurant,
  restaurantId: food.restaurant_id,
  source: food.source,
  sourceId: food.source_id,
  totalFat: food.total_fat,
})

const catalogLayer = () =>
  catalogReaderLayer(env.MONS_CATALOG_SCHEMA).pipe(
    Layer.provide(
      createDatabaseLayer({
        connectionString: env.Database.connectionString,
        maximumPoolSize: 1,
      }),
    ),
  )

const searchCatalog = Effect.fn('WebCatalog.search')(function* (
  data: typeof catalogQuerySchema.Type,
  offset: number,
) {
  const catalog = yield* CatalogReader
  return yield* catalog.search({
    limit: CATALOG_PAGE_SIZE + 1,
    offset,
    query: data.q,
    ...(data.brandId === undefined ? {} : { brandId: data.brandId }),
    ...(data.foodGroupId === undefined ? {} : { foodGroupId: data.foodGroupId }),
    ...(data.kind === undefined ? {} : { kind: data.kind }),
    ...(data.restaurantId === undefined ? {} : { restaurantId: data.restaurantId }),
  })
})

const toCatalogPage = (foods: ReadonlyArray<FoodSearchRecord>, offset: number) => {
  const hasMore = foods.length > CATALOG_PAGE_SIZE
  return {
    foods: foods.slice(0, CATALOG_PAGE_SIZE).map(toCatalogFood),
    nextOffset: hasMore ? offset + CATALOG_PAGE_SIZE : null,
  }
}

export const getCatalogFoodPage = createServerFn({ method: 'GET' })
  .validator(decodeCatalogPageQuery)
  .handler(({ data }) =>
    Effect.runPromise(
      searchCatalog(data, data.offset).pipe(
        Effect.map((foods) => toCatalogPage(foods, data.offset)),
        Effect.provide(catalogLayer()),
      ),
    ),
  )

export const getCatalogWorkspace = createServerFn({ method: 'GET' })
  .validator(decodeCatalogQuery)
  .handler(({ data }) => {
    const program = Effect.gen(function* () {
      const catalog = yield* CatalogReader
      const releaseId = yield* catalog.activeReleaseId()
      const foodGroups = yield* catalog.listFoodGroups()
      const brands = yield* catalog.listBrands({
        limit: 12,
        ...(data.brandQuery === undefined ? {} : { query: data.brandQuery }),
      })
      const restaurants = yield* catalog.listRestaurants({
        limit: 12,
        ...(data.restaurantQuery === undefined ? {} : { query: data.restaurantQuery }),
      })
      const foods = yield* searchCatalog(data, 0)
      const page = toCatalogPage(foods, 0)

      return {
        brands: brands.map((brand) => ({
          foodCount: Number(brand.food_count),
          id: brand.brand_id,
          name: brand.name,
        })),
        foodGroups: foodGroups.map((group) => ({
          foodCount: Number(group.food_count),
          id: group.food_group_id,
          name: group.name,
          slug: group.slug,
        })),
        foods: page.foods,
        nextOffset: page.nextOffset,
        releaseId,
        restaurants: restaurants.map((restaurant) => ({
          foodCount: Number(restaurant.food_count),
          id: restaurant.restaurant_id,
          name: restaurant.name,
        })),
        stage: env.MONS_STAGE,
      }
    })
    return Effect.runPromise(program.pipe(Effect.provide(catalogLayer())))
  })
