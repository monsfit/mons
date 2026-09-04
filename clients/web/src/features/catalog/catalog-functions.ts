import { env } from 'cloudflare:workers'
import { createServerFn } from '@tanstack/react-start'
import {
  CatalogReader,
  catalogReaderLayer,
  createDatabaseLayer,
  type FoodSearchRecord,
} from '@mons/database'
import { Effect, Layer, Schema } from 'effect'

const catalogQuerySchema = Schema.Struct({
  brandId: Schema.optionalKey(Schema.String),
  brandQuery: Schema.optionalKey(Schema.String),
  foodGroupId: Schema.optionalKey(Schema.String),
  kind: Schema.optionalKey(Schema.Literals(['raw', 'branded', 'restaurant'])),
  q: Schema.String,
})

const decodeCatalogQuery = Schema.decodeUnknownSync(catalogQuerySchema)

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
  totalFat: food.total_fat,
})

export const getCatalogWorkspace = createServerFn({ method: 'GET' })
  .validator(decodeCatalogQuery)
  .handler(({ data }) => {
    const database = createDatabaseLayer({
      connectionString: env.Database.connectionString,
      maximumPoolSize: 1,
    })
    const catalogLayer = catalogReaderLayer(env.MONS_CATALOG_SCHEMA).pipe(Layer.provide(database))
    const program = Effect.gen(function* () {
      const catalog = yield* CatalogReader
      const releaseId = yield* catalog.activeReleaseId()
      const foodGroups = yield* catalog.listFoodGroups()
      const brands = yield* catalog.listBrands({
        limit: 12,
        ...(data.brandQuery === undefined ? {} : { query: data.brandQuery }),
      })
      const foods = yield* catalog.search({
        limit: 50,
        query: data.q,
        ...(data.brandId === undefined ? {} : { brandId: data.brandId }),
        ...(data.foodGroupId === undefined ? {} : { foodGroupId: data.foodGroupId }),
        ...(data.kind === undefined ? {} : { kind: data.kind }),
      })

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
        foods: foods.map(toCatalogFood),
        releaseId,
        stage: env.MONS_STAGE,
      }
    })
    return Effect.runPromise(program.pipe(Effect.provide(catalogLayer)))
  })
