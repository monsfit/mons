import { Context, Effect, Layer, Schema } from 'effect'
import { SqlClient, SqlError } from 'effect/unstable/sql'

import { validateSchemaName } from '../../migrations.ts'
import type { DatasetKind } from '../../types.ts'

const foodPortionRecordSchema = Schema.Struct({
  amount: Schema.Number,
  name: Schema.String,
  unit: Schema.Literals(['g', 'ml', 'serving']),
})

const nutrientBasisRecordSchema = Schema.Struct({
  amount: Schema.Number,
  unit: Schema.Literals(['g', 'serving']),
})

const foodNutrientRecordSchema = Schema.Struct({
  amount: Schema.Number,
  field: Schema.String,
  name: Schema.String,
  unit: Schema.String,
})

const foodRecordSchema = Schema.Struct({
  brand: Schema.NullOr(Schema.String),
  brand_id: Schema.NullOr(Schema.String),
  calories: Schema.NullOr(Schema.Number),
  carbohydrates_total: Schema.NullOr(Schema.Number),
  dataset_kind: Schema.Literals(['raw', 'branded', 'restaurant']),
  food_id: Schema.String,
  food_group: Schema.String,
  food_group_id: Schema.String,
  food_subgroup: Schema.NullOr(Schema.String),
  food_subgroup_id: Schema.NullOr(Schema.String),
  gtin: Schema.NullOr(Schema.String),
  name: Schema.String,
  nutrient_basis: nutrientBasisRecordSchema,
  nutrients: Schema.Array(foodNutrientRecordSchema),
  portions: Schema.Array(foodPortionRecordSchema),
  protein: Schema.NullOr(Schema.Number),
  restaurant: Schema.NullOr(Schema.String),
  restaurant_id: Schema.NullOr(Schema.String),
  source: Schema.String,
  source_id: Schema.String,
  total_fat: Schema.NullOr(Schema.Number),
})

const foodSearchRecordSchema = Schema.Struct({
  brand: Schema.NullOr(Schema.String),
  brand_id: Schema.NullOr(Schema.String),
  calories: Schema.NullOr(Schema.Number),
  carbohydrates_total: Schema.NullOr(Schema.Number),
  dataset_kind: Schema.Literals(['raw', 'branded', 'restaurant']),
  default_portion: Schema.NullOr(foodPortionRecordSchema),
  food_id: Schema.String,
  food_group: Schema.String,
  food_group_id: Schema.String,
  food_subgroup: Schema.NullOr(Schema.String),
  food_subgroup_id: Schema.NullOr(Schema.String),
  name: Schema.String,
  nutrient_basis: nutrientBasisRecordSchema,
  protein: Schema.NullOr(Schema.Number),
  restaurant: Schema.NullOr(Schema.String),
  restaurant_id: Schema.NullOr(Schema.String),
  source: Schema.String,
  source_id: Schema.String,
  total_fat: Schema.NullOr(Schema.Number),
})

const catalogReleaseRecordSchema = Schema.Struct({ release_id: Schema.String })
const foodGroupRecordSchema = Schema.Struct({
  food_count: Schema.String,
  food_group_id: Schema.String,
  name: Schema.String,
  slug: Schema.String,
})
const brandRecordSchema = Schema.Struct({
  brand_id: Schema.String,
  food_count: Schema.String,
  name: Schema.String,
})
const restaurantRecordSchema = Schema.Struct({
  food_count: Schema.String,
  name: Schema.String,
  restaurant_id: Schema.String,
})

export type FoodPortionRecord = typeof foodPortionRecordSchema.Type
export type FoodNutrientRecord = typeof foodNutrientRecordSchema.Type
export type FoodRecord = typeof foodRecordSchema.Type
export type FoodSearchRecord = typeof foodSearchRecordSchema.Type
export type FoodGroupRecord = typeof foodGroupRecordSchema.Type
export type BrandRecord = typeof brandRecordSchema.Type
export type RestaurantRecord = typeof restaurantRecordSchema.Type

export interface FoodSearchOptions {
  readonly brandId?: string
  readonly foodGroupId?: string
  readonly kind?: DatasetKind
  readonly limit: number
  readonly offset?: number
  readonly query: string
  readonly restaurantId?: string
}

export interface BrandListOptions {
  readonly limit: number
  readonly query?: string
}

export type RestaurantListOptions = BrandListOptions

type CatalogReaderError = SqlError.SqlError | Schema.SchemaError

export interface CatalogReaderService {
  readonly activeReleaseId: () => Effect.Effect<string, CatalogReaderError>
  readonly findById: (
    datasetKind: DatasetKind,
    foodId: string,
  ) => Effect.Effect<FoodRecord | undefined, CatalogReaderError>
  readonly findByGtin: (gtin: string) => Effect.Effect<FoodRecord | undefined, CatalogReaderError>
  readonly listBrands: (
    options: BrandListOptions,
  ) => Effect.Effect<ReadonlyArray<BrandRecord>, CatalogReaderError>
  readonly listFoodGroups: () => Effect.Effect<ReadonlyArray<FoodGroupRecord>, CatalogReaderError>
  readonly listRestaurants: (
    options: RestaurantListOptions,
  ) => Effect.Effect<ReadonlyArray<RestaurantRecord>, CatalogReaderError>
  readonly search: (
    options: FoodSearchOptions,
  ) => Effect.Effect<ReadonlyArray<FoodSearchRecord>, CatalogReaderError>
}

export const CatalogReader = Context.Service<CatalogReaderService>('@mons/database/CatalogReader')

const decodeFoodRows = Schema.decodeUnknownEffect(Schema.Array(foodRecordSchema))
const decodeFoodSearchRows = Schema.decodeUnknownEffect(Schema.Array(foodSearchRecordSchema))
const decodeCatalogReleaseRows = Schema.decodeUnknownEffect(
  Schema.NonEmptyArray(catalogReleaseRecordSchema),
)
const decodeFoodGroupRows = Schema.decodeUnknownEffect(Schema.Array(foodGroupRecordSchema))
const decodeBrandRows = Schema.decodeUnknownEffect(Schema.Array(brandRecordSchema))
const decodeRestaurantRows = Schema.decodeUnknownEffect(Schema.Array(restaurantRecordSchema))

const sourceCode = (tableAlias: string) =>
  `CASE ${tableAlias}.source_key
    WHEN 1 THEN 'usda_fooddata_central_branded' WHEN 2 THEN 'open_food_facts'
    WHEN 3 THEN 'usda_fooddata_central_foundation' WHEN 4 THEN 'usda_fooddata_central_sr_legacy'
    WHEN 5 THEN 'usda_fooddata_central_survey' WHEN 6 THEN 'canadian_nutrient_file'
    WHEN 7 THEN 'cofid' WHEN 8 THEN 'nevo2025' WHEN 9 THEN 'australian_food_composition'
    WHEN 10 THEN 'new_zealand_food_composition' WHEN 11 THEN 'fastfoodnutrition_org'
    WHEN 30000 THEN 'integration_test' WHEN 30001 THEN 'mons_sample'
    ELSE 'unknown' END`

export const makeCatalogReader = (schema = 'mons_catalog') =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const safeSchema = yield* validateSchemaName(schema)
    const foods = sql(`${safeSchema}.foods`)
    const brands = sql(`${safeSchema}.brands`)
    const foodGroups = sql(`${safeSchema}.food_groups`)
    const foodSubgroups = sql(`${safeSchema}.food_subgroups`)
    const restaurants = sql(`${safeSchema}.restaurants`)
    const catalogMetadata = sql(`${safeSchema}.catalog_metadata`)

    const nutrientDefinitions = `
      (VALUES
        ('calories', 'Food energy', 'kcal'), ('protein', 'Protein', 'g'),
        ('total_fat', 'Total fat', 'g'), ('carbohydrates_total', 'Total carbohydrate', 'g'),
        ('carbohydrates_available', 'Available carbohydrate', 'g'),
        ('carbohydrates_net_calculated', 'Calculated net carbohydrate', 'g'),
        ('fiber', 'Dietary fibre', 'g'), ('starch', 'Starch', 'g'),
        ('total_sugars', 'Total sugars', 'g'), ('added_sugars', 'Added sugars', 'g'),
        ('cysteine', 'Cysteine', 'g'), ('histidine', 'Histidine', 'g'),
        ('isoleucine', 'Isoleucine', 'g'), ('leucine', 'Leucine', 'g'),
        ('lysine', 'Lysine', 'g'), ('methionine', 'Methionine', 'g'),
        ('phenylalanine', 'Phenylalanine', 'g'), ('threonine', 'Threonine', 'g'),
        ('tryptophan', 'Tryptophan', 'g'), ('tyrosine', 'Tyrosine', 'g'),
        ('valine', 'Valine', 'g'), ('monounsaturated_fat', 'Monounsaturated fat', 'g'),
        ('polyunsaturated_fat', 'Polyunsaturated fat', 'g'),
        ('omega_3_total_reported', 'Reported omega-3 fat', 'g'),
        ('omega_3_ala_epa_dha_sum', 'ALA + EPA + DHA', 'g'),
        ('omega_3_ala', 'Alpha-linolenic acid', 'g'), ('omega_3_epa', 'EPA', 'g'),
        ('omega_3_dha', 'DHA', 'g'), ('omega_6_total_reported', 'Reported omega-6 fat', 'g'),
        ('omega_6_linoleic_acid', 'Linoleic acid', 'g'),
        ('saturated_fat', 'Saturated fat', 'g'), ('trans_fat', 'Trans fat', 'g'),
        ('vitamin_a_retinol', 'Retinol', 'mcg'), ('vitamin_b1_thiamin', 'Thiamin', 'mg'),
        ('vitamin_b2_riboflavin', 'Riboflavin', 'mg'), ('vitamin_b3_niacin', 'Niacin', 'mg'),
        ('vitamin_b5_pantothenic_acid', 'Pantothenic acid', 'mg'),
        ('vitamin_b6', 'Vitamin B6', 'mg'), ('vitamin_b12_cobalamin', 'Vitamin B12', 'mcg'),
        ('folate_total', 'Total folate', 'mcg'), ('folate_dfe', 'Dietary folate equivalents', 'mcg'),
        ('vitamin_c_ascorbic_acid', 'Vitamin C', 'mg'),
        ('vitamin_d_calciferol', 'Vitamin D', 'mcg'),
        ('vitamin_e_tocopherol', 'Vitamin E', 'mg'),
        ('vitamin_k_phylloquinone', 'Phylloquinone', 'mcg'),
        ('calcium', 'Calcium', 'mg'), ('copper', 'Copper', 'mg'), ('iron', 'Iron', 'mg'),
        ('manganese', 'Manganese', 'mg'), ('magnesium', 'Magnesium', 'mg'),
        ('phosphorus', 'Phosphorus', 'mg'), ('potassium', 'Potassium', 'mg'),
        ('selenium', 'Selenium', 'mcg'), ('sodium', 'Sodium', 'mg'), ('zinc', 'Zinc', 'mg'),
        ('dietary_cholesterol', 'Dietary cholesterol', 'mg'), ('caffeine', 'Caffeine', 'mg'),
        ('alcohol', 'Alcohol', 'g'), ('water', 'Water', 'g'), ('choline', 'Choline', 'mg')
      ) AS nutrient(field_name, description, unit)
    `

    const selectedFoodColumns = (tableAlias: string) =>
      sql.literal(`
      b.name AS brand,
      ${tableAlias}.brand_id,
      ${tableAlias}.calories,
      coalesce(${tableAlias}.carbohydrates_total, ${tableAlias}.carbohydrates_available) AS carbohydrates_total,
      ${tableAlias}.dataset_kind,
      ${tableAlias}.food_id,
      fg.name AS food_group,
      ${tableAlias}.food_group_id,
      fsg.name AS food_subgroup,
      ${tableAlias}.food_subgroup_id,
      ${tableAlias}.gtin,
      ${tableAlias}.name,
      json_build_object(
        'amount', ${tableAlias}.nutrient_basis_amount,
        'unit', ${tableAlias}.nutrient_basis_unit
      ) AS nutrient_basis,
      coalesce((
        SELECT json_agg(
          json_build_object(
            'amount', (to_jsonb(${tableAlias}) ->> nutrient.field_name)::double precision,
            'field', nutrient.field_name,
            'name', nutrient.description,
            'unit', nutrient.unit
          ) ORDER BY nutrient.field_name
        )
        FROM ${nutrientDefinitions}
        WHERE to_jsonb(${tableAlias}) ->> nutrient.field_name IS NOT NULL
      ), '[]'::json) AS nutrients,
      ${tableAlias}.protein,
      r.name AS restaurant,
      ${tableAlias}.restaurant_id,
      coalesce((
        SELECT json_agg(
          json_build_object('amount', portion.amount, 'name', portion.name, 'unit', portion.unit)
          ORDER BY portion.ordinal
        )
        FROM ${safeSchema}.portions AS portion
        WHERE portion.food_id = ${tableAlias}.food_id
      ), '[]'::json) AS portions,
      ${sourceCode(tableAlias)} AS source,
      ${tableAlias}.source_record_id AS source_id,
      ${tableAlias}.total_fat
    `)

    const selectedSearchColumns = (tableAlias: string) =>
      sql.literal(`
      b.name AS brand,
      ${tableAlias}.brand_id,
      ${tableAlias}.calories,
      coalesce(${tableAlias}.carbohydrates_total, ${tableAlias}.carbohydrates_available) AS carbohydrates_total,
      ${tableAlias}.dataset_kind,
      (
        SELECT json_build_object(
          'amount', portion.amount,
          'name', portion.name,
          'unit', portion.unit
        )
        FROM ${safeSchema}.portions AS portion
        WHERE portion.food_id = ${tableAlias}.food_id
        ORDER BY portion.ordinal
        LIMIT 1
      ) AS default_portion,
      ${tableAlias}.food_id,
      fg.name AS food_group,
      ${tableAlias}.food_group_id,
      fsg.name AS food_subgroup,
      ${tableAlias}.food_subgroup_id,
      ${tableAlias}.name,
      json_build_object(
        'amount', ${tableAlias}.nutrient_basis_amount,
        'unit', ${tableAlias}.nutrient_basis_unit
      ) AS nutrient_basis,
      ${tableAlias}.protein,
      r.name AS restaurant,
      ${tableAlias}.restaurant_id,
      ${sourceCode(tableAlias)} AS source,
      ${tableAlias}.source_record_id AS source_id,
      ${tableAlias}.total_fat
    `)

    const validFood = sql.literal(`
      char_length(f.name) <= 160
      AND f.calories IS NOT NULL AND f.calories >= 0
      AND f.protein IS NOT NULL AND f.protein >= 0
      AND f.total_fat IS NOT NULL AND f.total_fat >= 0
      AND coalesce(f.carbohydrates_total, f.carbohydrates_available) IS NOT NULL
      AND coalesce(f.carbohydrates_total, f.carbohydrates_available) >= 0
      AND (
        f.dataset_kind = 'restaurant'
        OR (
          f.calories <= 1000 AND f.protein <= 100 AND f.total_fat <= 100
          AND coalesce(f.carbohydrates_total, f.carbohydrates_available) <= 100
          AND f.protein + f.total_fat + coalesce(f.carbohydrates_total, f.carbohydrates_available) <= 120
          AND (f.calories > 0 OR f.protein + f.total_fat + coalesce(f.carbohydrates_total, f.carbohydrates_available) = 0)
          AND (f.dataset_kind = 'raw' OR f.gtin IS NOT NULL)
        )
      )
    `)

    const sourcePriority = sql.literal('f.source_key')

    const findByGtin = Effect.fn('CatalogReader.findByGtin')(function* (gtin: string) {
      const rows = yield* sql`
        SELECT ${selectedFoodColumns('f')}
        FROM ${foods} AS f
        LEFT JOIN ${brands} AS b ON b.brand_id = f.brand_id
        LEFT JOIN ${restaurants} AS r ON r.restaurant_id = f.restaurant_id
        INNER JOIN ${foodGroups} AS fg ON fg.food_group_id = f.food_group_id
        LEFT JOIN ${foodSubgroups} AS fsg ON fsg.food_subgroup_id = f.food_subgroup_id
        WHERE f.dataset_kind = 'branded' AND f.gtin = ${gtin} AND ${validFood}
        LIMIT 1
      `
      const decoded = yield* decodeFoodRows(rows)
      return decoded[0]
    })

    const activeReleaseId = Effect.fn('CatalogReader.activeReleaseId')(function* () {
      const rows = yield* sql`
        SELECT release_id || coalesce('+' || restaurant_snapshot_id, '') AS release_id
        FROM ${catalogMetadata} LIMIT 1
      `
      const decoded = yield* decodeCatalogReleaseRows(rows)
      return decoded[0].release_id
    })

    const findById = Effect.fn('CatalogReader.findById')(function* (
      datasetKind: DatasetKind,
      foodId: string,
    ) {
      const rows = yield* sql`
        SELECT ${selectedFoodColumns('f')}
        FROM ${foods} AS f
        LEFT JOIN ${brands} AS b ON b.brand_id = f.brand_id
        LEFT JOIN ${restaurants} AS r ON r.restaurant_id = f.restaurant_id
        INNER JOIN ${foodGroups} AS fg ON fg.food_group_id = f.food_group_id
        LEFT JOIN ${foodSubgroups} AS fsg ON fsg.food_subgroup_id = f.food_subgroup_id
        WHERE f.dataset_kind = ${datasetKind} AND f.food_id = ${foodId} AND ${validFood}
        LIMIT 1
      `
      const decoded = yield* decodeFoodRows(rows)
      return decoded[0]
    })

    const listFoodGroups = Effect.fn('CatalogReader.listFoodGroups')(function* () {
      const rows = yield* sql`
        SELECT fg.food_group_id, fg.slug, fg.name, count(f.food_id)::text AS food_count
        FROM ${foodGroups} AS fg
        LEFT JOIN ${foods} AS f ON f.food_group_id = fg.food_group_id
        GROUP BY fg.food_group_id, fg.slug, fg.name
        ORDER BY fg.name COLLATE "C", fg.food_group_id
      `
      return yield* decodeFoodGroupRows(rows)
    })

    const listBrands = Effect.fn('CatalogReader.listBrands')(function* (options: BrandListOptions) {
      const prefix = `${(options.query ?? '')
        .trim()
        .toLocaleLowerCase()
        .replaceAll('!', '!!')
        .replaceAll('%', '!%')
        .replaceAll('_', '!_')}%`
      const rows = yield* sql`
        SELECT
          b.brand_id,
          b.name,
          (SELECT count(*)::text FROM ${foods} AS f WHERE f.brand_id = b.brand_id) AS food_count
        FROM ${brands} AS b
        WHERE (lower(b.name) COLLATE "C") LIKE ${prefix} ESCAPE '!'
        ORDER BY lower(b.name) COLLATE "C", b.brand_id
        LIMIT ${options.limit}
      `
      return yield* decodeBrandRows(rows)
    })

    const listRestaurants = Effect.fn('CatalogReader.listRestaurants')(function* (
      options: RestaurantListOptions,
    ) {
      const prefix = `${(options.query ?? '')
        .trim()
        .toLocaleLowerCase()
        .replaceAll('!', '!!')
        .replaceAll('%', '!%')
        .replaceAll('_', '!_')}%`
      const rows = yield* sql`
        SELECT
          r.restaurant_id,
          r.name,
          (SELECT count(*)::text FROM ${foods} AS f WHERE f.restaurant_id = r.restaurant_id) AS food_count
        FROM ${restaurants} AS r
        WHERE (lower(r.name) COLLATE "C") LIKE ${prefix} ESCAPE '!'
        ORDER BY lower(r.name) COLLATE "C", r.restaurant_id
        LIMIT ${options.limit}
      `
      return yield* decodeRestaurantRows(rows)
    })

    const search = Effect.fn('CatalogReader.search')(function* (options: FoodSearchOptions) {
      const offset = Math.max(options.offset ?? 0, 0)
      const targetLimit = offset + options.limit
      const escapedPrefix = `${options.query
        .trim()
        .toLocaleLowerCase()
        .replaceAll('!', '!!')
        .replaceAll('%', '!%')
        .replaceAll('_', '!_')}%`
      yield* Effect.annotateCurrentSpan({
        'catalog.search.dataset_kind': options.kind ?? 'all',
        'catalog.search.limit': options.limit,
        'catalog.search.offset': offset,
        'catalog.search.query_length': options.query.length,
      })

      const aliasRows = yield* sql`
        WITH search_query AS (
          SELECT to_tsquery(
            'simple',
            string_agg(quote_literal(term) || ':*', ' & ')
          ) AS value
          FROM unnest(tsvector_to_array(to_tsvector('simple', ${options.query}))) AS term
        )
        SELECT ${selectedSearchColumns('f')}
        FROM ${foods} AS f
        LEFT JOIN ${brands} AS b ON b.brand_id = f.brand_id
        LEFT JOIN ${restaurants} AS r ON r.restaurant_id = f.restaurant_id
        INNER JOIN ${foodGroups} AS fg ON fg.food_group_id = f.food_group_id
        LEFT JOIN ${foodSubgroups} AS fsg ON fsg.food_subgroup_id = f.food_subgroup_id
        CROSS JOIN search_query
        WHERE (${options.kind ?? null}::text IS NULL OR f.dataset_kind = ${options.kind ?? null})
          AND (${options.brandId ?? null}::bigint IS NULL OR f.brand_id = ${options.brandId ?? null})
          AND (${options.restaurantId ?? null}::bigint IS NULL OR f.restaurant_id = ${options.restaurantId ?? null})
          AND (${options.foodGroupId ?? null}::bigint IS NULL OR f.food_group_id = ${options.foodGroupId ?? null})
          AND f.search_aliases <> ''
          AND f.search_document @@ search_query.value
          AND to_tsvector('simple', f.search_aliases) @@ search_query.value
          AND ${validFood}
        ORDER BY
          ts_rank_cd(to_tsvector('simple', f.search_aliases), search_query.value) DESC,
          ${sourcePriority} ASC,
          f.food_id ASC
        LIMIT ${targetLimit}
      `
      const aliasFoods = yield* decodeFoodSearchRows(aliasRows)
      if (aliasFoods.length >= targetLimit) return aliasFoods.slice(offset, targetLimit)

      const nameRows = yield* sql`
        SELECT ${selectedSearchColumns('f')}
        FROM ${foods} AS f
        LEFT JOIN ${brands} AS b ON b.brand_id = f.brand_id
        LEFT JOIN ${restaurants} AS r ON r.restaurant_id = f.restaurant_id
        INNER JOIN ${foodGroups} AS fg ON fg.food_group_id = f.food_group_id
        LEFT JOIN ${foodSubgroups} AS fsg ON fsg.food_subgroup_id = f.food_subgroup_id
        WHERE (${options.kind ?? null}::text IS NULL OR f.dataset_kind = ${options.kind ?? null})
          AND (${options.brandId ?? null}::bigint IS NULL OR f.brand_id = ${options.brandId ?? null})
          AND (${options.restaurantId ?? null}::bigint IS NULL OR f.restaurant_id = ${options.restaurantId ?? null})
          AND (${options.foodGroupId ?? null}::bigint IS NULL OR f.food_group_id = ${options.foodGroupId ?? null})
          AND (lower(f.name) COLLATE "C") LIKE ${escapedPrefix} ESCAPE '!'
          AND ${validFood}
        ORDER BY
          lower(f.name) COLLATE "C" ASC,
          ${sourcePriority} ASC,
          f.food_id ASC
        LIMIT ${targetLimit}
      `
      const nameFoods = yield* decodeFoodSearchRows(nameRows)
      const foodsById = new Map<string, FoodSearchRecord>(
        aliasFoods.map((food) => [`${food.dataset_kind}:${food.food_id}`, food] as const),
      )
      for (const food of nameFoods) {
        const id = `${food.dataset_kind}:${food.food_id}`
        if (!foodsById.has(id)) foodsById.set(id, food)
        if (foodsById.size >= targetLimit) return [...foodsById.values()].slice(offset, targetLimit)
      }
      if (options.kind !== 'raw') {
        const brandRows = yield* sql`
          WITH candidates AS MATERIALIZED (
            (
              SELECT f.food_id
              FROM ${foods} AS f
              INNER JOIN ${brands} AS brand ON brand.brand_id = f.brand_id
              WHERE (${options.kind ?? null}::text IS NULL OR ${options.kind ?? null} = 'branded')
                AND f.dataset_kind = 'branded'
                AND (${options.brandId ?? null}::bigint IS NULL OR f.brand_id = ${options.brandId ?? null})
                AND ${options.restaurantId ?? null}::bigint IS NULL
                AND (${options.foodGroupId ?? null}::bigint IS NULL OR f.food_group_id = ${options.foodGroupId ?? null})
                AND (lower(brand.name) COLLATE "C") LIKE ${escapedPrefix} ESCAPE '!'
                AND ${validFood}
            )
            UNION ALL
            (
              SELECT f.food_id
              FROM ${restaurants} AS restaurant
              INNER JOIN ${foods} AS f ON f.restaurant_id = restaurant.restaurant_id
              WHERE (${options.kind ?? null}::text IS NULL OR ${options.kind ?? null} = 'restaurant')
                AND ${options.brandId ?? null}::bigint IS NULL
                AND (${options.restaurantId ?? null}::bigint IS NULL OR f.restaurant_id = ${options.restaurantId ?? null})
                AND (${options.foodGroupId ?? null}::bigint IS NULL OR f.food_group_id = ${options.foodGroupId ?? null})
                AND (lower(restaurant.name) COLLATE "C") LIKE ${escapedPrefix} ESCAPE '!'
                AND ${validFood}
            )
          )
          SELECT ${selectedSearchColumns('f')}
          FROM ${foods} AS f
          INNER JOIN candidates AS candidate ON candidate.food_id = f.food_id
          LEFT JOIN ${brands} AS b ON b.brand_id = f.brand_id
          LEFT JOIN ${restaurants} AS r ON r.restaurant_id = f.restaurant_id
          INNER JOIN ${foodGroups} AS fg ON fg.food_group_id = f.food_group_id
          LEFT JOIN ${foodSubgroups} AS fsg ON fsg.food_subgroup_id = f.food_subgroup_id
          ORDER BY
            lower(coalesce(b.name, r.name)) COLLATE "C" ASC,
            ${sourcePriority} ASC,
            f.food_id ASC
          LIMIT ${targetLimit}
        `
        const brandFoods = yield* decodeFoodSearchRows(brandRows)
        for (const food of brandFoods) {
          const id = `${food.dataset_kind}:${food.food_id}`
          if (!foodsById.has(id)) foodsById.set(id, food)
          if (foodsById.size >= targetLimit)
            return [...foodsById.values()].slice(offset, targetLimit)
        }
      }

      const fallbackRows = yield* sql`
        WITH search_query AS (
          SELECT to_tsquery(
            'simple',
            string_agg(quote_literal(term) || ':*', ' & ')
          ) AS value
          FROM unnest(tsvector_to_array(to_tsvector('simple', ${options.query}))) AS term
        ), candidates AS MATERIALIZED (
          (
            SELECT f.dataset_kind, f.food_id
            FROM ${foods} AS f
            CROSS JOIN search_query
            WHERE (${options.kind ?? null}::text IS NULL OR f.dataset_kind = ${options.kind ?? null})
              AND (${options.brandId ?? null}::bigint IS NULL OR f.brand_id = ${options.brandId ?? null})
              AND (${options.restaurantId ?? null}::bigint IS NULL OR f.restaurant_id = ${options.restaurantId ?? null})
              AND (${options.foodGroupId ?? null}::bigint IS NULL OR f.food_group_id = ${options.foodGroupId ?? null})
              AND f.search_document @@ search_query.value
              AND ${validFood}
          )
          UNION
          (
            SELECT f.dataset_kind, f.food_id
            FROM ${brands} AS brand
            INNER JOIN ${foods} AS f ON f.brand_id = brand.brand_id
            CROSS JOIN search_query
            WHERE (${options.kind ?? null}::text IS NULL OR ${options.kind ?? null} = 'branded')
              AND (${options.brandId ?? null}::bigint IS NULL OR f.brand_id = ${options.brandId ?? null})
              AND ${options.restaurantId ?? null}::bigint IS NULL
              AND (${options.foodGroupId ?? null}::bigint IS NULL OR f.food_group_id = ${options.foodGroupId ?? null})
              AND to_tsvector('simple', brand.name) @@ search_query.value
              AND ${validFood}
          )
          UNION
          (
            SELECT f.dataset_kind, f.food_id
            FROM ${restaurants} AS restaurant
            INNER JOIN ${foods} AS f ON f.restaurant_id = restaurant.restaurant_id
            CROSS JOIN search_query
            WHERE (${options.kind ?? null}::text IS NULL OR ${options.kind ?? null} = 'restaurant')
              AND ${options.brandId ?? null}::bigint IS NULL
              AND (${options.restaurantId ?? null}::bigint IS NULL OR f.restaurant_id = ${options.restaurantId ?? null})
              AND (${options.foodGroupId ?? null}::bigint IS NULL OR f.food_group_id = ${options.foodGroupId ?? null})
              AND to_tsvector('simple', restaurant.name) @@ search_query.value
              AND ${validFood}
          )
        )
        SELECT ${selectedSearchColumns('f')}
        FROM ${foods} AS f
        INNER JOIN candidates AS candidate
          ON candidate.food_id = f.food_id
        LEFT JOIN ${brands} AS b ON b.brand_id = f.brand_id
        LEFT JOIN ${restaurants} AS r ON r.restaurant_id = f.restaurant_id
        INNER JOIN ${foodGroups} AS fg ON fg.food_group_id = f.food_group_id
        LEFT JOIN ${foodSubgroups} AS fsg ON fsg.food_subgroup_id = f.food_subgroup_id
        CROSS JOIN search_query
        ORDER BY
          greatest(
            ts_rank_cd(f.search_document, search_query.value),
            ts_rank_cd(to_tsvector('simple', coalesce(b.name, '')), search_query.value),
            ts_rank_cd(to_tsvector('simple', coalesce(r.name, '')), search_query.value)
          ) DESC,
          ${sourcePriority} ASC,
          f.food_id ASC
        LIMIT ${targetLimit}
      `
      const fallbackFoods = yield* decodeFoodSearchRows(fallbackRows)
      for (const food of fallbackFoods) {
        const id = `${food.dataset_kind}:${food.food_id}`
        if (!foodsById.has(id)) foodsById.set(id, food)
        if (foodsById.size >= targetLimit) break
      }
      return [...foodsById.values()].slice(offset, targetLimit)
    })

    return CatalogReader.of({
      activeReleaseId,
      findByGtin,
      findById,
      listBrands,
      listFoodGroups,
      listRestaurants,
      search,
    })
  })

export const catalogReaderLayer = (schema = 'mons_catalog') =>
  Layer.effect(CatalogReader, makeCatalogReader(schema))
