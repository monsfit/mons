import { Context, Effect, Layer, Schema } from 'effect'
import { SqlClient, SqlError } from 'effect/unstable/sql'

import { validateSchemaName } from '../../migrations.ts'
import type { DatasetKind } from '../../types.ts'

const foodPortionRecordSchema = Schema.Struct({
  amount: Schema.Number,
  name: Schema.String,
  unit: Schema.Literals(['g', 'ml']),
})

const foodNutrientRecordSchema = Schema.Struct({
  amount: Schema.Number,
  field: Schema.String,
  name: Schema.String,
  unit: Schema.String,
})

const foodRecordSchema = Schema.Struct({
  brand: Schema.NullOr(Schema.String),
  calories: Schema.NullOr(Schema.Number),
  carbohydrates_total: Schema.NullOr(Schema.Number),
  dataset_kind: Schema.Literals(['raw', 'branded']),
  food_id: Schema.String,
  gtin: Schema.NullOr(Schema.String),
  name: Schema.String,
  nutrients: Schema.Array(foodNutrientRecordSchema),
  portions: Schema.Array(foodPortionRecordSchema),
  protein: Schema.NullOr(Schema.Number),
  source: Schema.String,
  source_id: Schema.String,
  total_fat: Schema.NullOr(Schema.Number),
})

const foodSearchRecordSchema = Schema.Struct({
  brand: Schema.NullOr(Schema.String),
  calories: Schema.NullOr(Schema.Number),
  carbohydrates_total: Schema.NullOr(Schema.Number),
  dataset_kind: Schema.Literals(['raw', 'branded']),
  default_portion: Schema.NullOr(foodPortionRecordSchema),
  food_id: Schema.String,
  name: Schema.String,
  protein: Schema.NullOr(Schema.Number),
  total_fat: Schema.NullOr(Schema.Number),
})

const catalogReleaseRecordSchema = Schema.Struct({ release_id: Schema.String })

export type FoodPortionRecord = typeof foodPortionRecordSchema.Type
export type FoodNutrientRecord = typeof foodNutrientRecordSchema.Type
export type FoodRecord = typeof foodRecordSchema.Type
export type FoodSearchRecord = typeof foodSearchRecordSchema.Type

export interface FoodSearchOptions {
  readonly kind?: DatasetKind
  readonly limit: number
  readonly query: string
}

type CatalogReaderError = SqlError.SqlError | Schema.SchemaError

export interface CatalogReaderService {
  readonly activeReleaseId: () => Effect.Effect<string, CatalogReaderError>
  readonly findById: (
    datasetKind: DatasetKind,
    foodId: string,
  ) => Effect.Effect<FoodRecord | undefined, CatalogReaderError>
  readonly findByGtin: (gtin: string) => Effect.Effect<FoodRecord | undefined, CatalogReaderError>
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

export const makeCatalogReader = (schema = 'mons_catalog') =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const safeSchema = yield* validateSchemaName(schema)
    const foods = sql(`${safeSchema}.foods`)
    const rawFoods = sql(`${safeSchema}.raw_foods`)
    const brandedFoods = sql(`${safeSchema}.branded_foods`)
    const catalogMetadata = sql(`${safeSchema}.catalog_metadata`)

    const selectedFoodColumns = (tableAlias: string) =>
      sql.literal(`
      ${tableAlias}.brand,
      ${tableAlias}.calories,
      coalesce(${tableAlias}.carbohydrates_total, ${tableAlias}.carbohydrates_available) AS carbohydrates_total,
      ${tableAlias}.dataset_kind,
      ${tableAlias}.food_id,
      ${tableAlias}.gtin,
      ${tableAlias}.name,
      coalesce((
        SELECT json_agg(
          json_build_object(
            'amount', (to_jsonb(${tableAlias}) ->> nutrient.field_name)::double precision,
            'field', nutrient.field_name,
            'name', regexp_replace(nutrient.description, ' per 100 g$', ''),
            'unit', nutrient.unit
          ) ORDER BY nutrient.field_name
        )
        FROM ${safeSchema}.nutrient_definitions AS nutrient
        WHERE to_jsonb(${tableAlias}) ->> nutrient.field_name IS NOT NULL
      ), '[]'::json) AS nutrients,
      ${tableAlias}.protein,
      coalesce((
        SELECT json_agg(
          json_build_object('amount', portion.amount, 'name', portion.name, 'unit', portion.unit)
          ORDER BY portion.ordinal
        )
        FROM ${safeSchema}.portions AS portion
        WHERE portion.dataset_kind = ${tableAlias}.dataset_kind AND portion.food_id = ${tableAlias}.food_id
      ), '[]'::json) AS portions,
      ${tableAlias}.source,
      ${tableAlias}.source_id,
      ${tableAlias}.total_fat
    `)

    const selectedSearchColumns = (tableAlias: string) =>
      sql.literal(`
      ${tableAlias}.brand,
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
        WHERE portion.dataset_kind = ${tableAlias}.dataset_kind
          AND portion.food_id = ${tableAlias}.food_id
          AND portion.unit = 'g'
        ORDER BY portion.ordinal
        LIMIT 1
      ) AS default_portion,
      ${tableAlias}.food_id,
      ${tableAlias}.name,
      ${tableAlias}.protein,
      ${tableAlias}.total_fat
    `)

    const validFood = sql.literal(`
      char_length(f.name) <= 160
      AND f.calories IS NOT NULL AND f.calories BETWEEN 0 AND 1000
      AND f.protein IS NOT NULL AND f.protein BETWEEN 0 AND 100
      AND f.total_fat IS NOT NULL AND f.total_fat BETWEEN 0 AND 100
      AND coalesce(f.carbohydrates_total, f.carbohydrates_available) IS NOT NULL
      AND coalesce(f.carbohydrates_total, f.carbohydrates_available) BETWEEN 0 AND 100
      AND f.protein + f.total_fat + coalesce(f.carbohydrates_total, f.carbohydrates_available) <= 120
      AND (f.calories > 0 OR f.protein + f.total_fat + coalesce(f.carbohydrates_total, f.carbohydrates_available) = 0)
      AND (f.dataset_kind = 'raw' OR f.gtin IS NOT NULL)
    `)

    const sourcePriority = sql.literal(`
      CASE f.source
        WHEN 'usda_fooddata_central_branded' THEN 0
        WHEN 'open_food_facts' THEN 1
        ELSE 2
      END
    `)

    const findByGtin = Effect.fn('CatalogReader.findByGtin')(function* (gtin: string) {
      const rows = yield* sql`
        SELECT ${selectedFoodColumns('f')}
        FROM ${brandedFoods} AS f
        WHERE f.gtin = ${gtin} AND ${validFood}
        LIMIT 1
      `
      const decoded = yield* decodeFoodRows(rows)
      return decoded[0]
    })

    const activeReleaseId = Effect.fn('CatalogReader.activeReleaseId')(function* () {
      const rows = yield* sql`SELECT release_id FROM ${catalogMetadata} LIMIT 1`
      const decoded = yield* decodeCatalogReleaseRows(rows)
      return decoded[0].release_id
    })

    const findById = Effect.fn('CatalogReader.findById')(function* (
      datasetKind: DatasetKind,
      foodId: string,
    ) {
      const selectedFoods = datasetKind === 'raw' ? rawFoods : brandedFoods
      const rows = yield* sql`
        SELECT ${selectedFoodColumns('f')}
        FROM ${selectedFoods} AS f
        WHERE f.food_id = ${foodId} AND ${validFood}
        LIMIT 1
      `
      const decoded = yield* decodeFoodRows(rows)
      return decoded[0]
    })

    const search = Effect.fn('CatalogReader.search')(function* (options: FoodSearchOptions) {
      const searchFoods =
        options.kind === 'raw' ? rawFoods : options.kind === 'branded' ? brandedFoods : foods
      const fallbackCandidateLimit = Math.max(options.limit * 10, 100)
      const escapedPrefix = `${options.query
        .trim()
        .toLocaleLowerCase()
        .replaceAll('!', '!!')
        .replaceAll('%', '!%')
        .replaceAll('_', '!_')}%`
      yield* Effect.annotateCurrentSpan({
        'catalog.search.dataset_kind': options.kind ?? 'all',
        'catalog.search.limit': options.limit,
        'catalog.search.query_length': options.query.length,
      })

      const nameRows = yield* sql`
        SELECT ${selectedSearchColumns('f')}
        FROM ${searchFoods} AS f
        WHERE (lower(f.name) COLLATE "C") LIKE ${escapedPrefix} ESCAPE '!'
          AND ${validFood}
        ORDER BY
          lower(f.name) COLLATE "C" ASC,
          ${sourcePriority} ASC,
          f.food_id ASC
        LIMIT ${options.limit}
      `
      const nameFoods = yield* decodeFoodSearchRows(nameRows)
      if (nameFoods.length >= options.limit) return nameFoods

      const foodsById = new Map<string, FoodSearchRecord>(
        nameFoods.map((food) => [`${food.dataset_kind}:${food.food_id}`, food] as const),
      )
      if (options.kind !== 'raw') {
        const brandRows = yield* sql`
          SELECT ${selectedSearchColumns('f')}
          FROM ${brandedFoods} AS f
          WHERE (lower(f.brand) COLLATE "C") LIKE ${escapedPrefix} ESCAPE '!'
            AND ${validFood}
          ORDER BY
            lower(f.brand) COLLATE "C" ASC,
            ${sourcePriority} ASC,
            f.food_id ASC
          LIMIT ${options.limit}
        `
        const brandFoods = yield* decodeFoodSearchRows(brandRows)
        for (const food of brandFoods) {
          const id = `${food.dataset_kind}:${food.food_id}`
          if (!foodsById.has(id)) foodsById.set(id, food)
          if (foodsById.size >= options.limit) return [...foodsById.values()]
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
          SELECT f.dataset_kind, f.food_id
          FROM ${searchFoods} AS f
          CROSS JOIN search_query
          WHERE f.search_document @@ search_query.value
            AND ${validFood}
          LIMIT ${fallbackCandidateLimit}
        )
        SELECT ${selectedSearchColumns('f')}
        FROM ${searchFoods} AS f
        INNER JOIN candidates AS candidate
          ON candidate.dataset_kind = f.dataset_kind AND candidate.food_id = f.food_id
        CROSS JOIN search_query
        ORDER BY
          ts_rank_cd(f.search_document, search_query.value) DESC,
          ${sourcePriority} ASC,
          f.food_id ASC
        LIMIT ${options.limit}
      `
      const fallbackFoods = yield* decodeFoodSearchRows(fallbackRows)
      for (const food of fallbackFoods) {
        const id = `${food.dataset_kind}:${food.food_id}`
        if (!foodsById.has(id)) foodsById.set(id, food)
        if (foodsById.size >= options.limit) break
      }
      return [...foodsById.values()]
    })

    return CatalogReader.of({ activeReleaseId, findByGtin, findById, search })
  })

export const catalogReaderLayer = (schema = 'mons_catalog') =>
  Layer.effect(CatalogReader, makeCatalogReader(schema))
