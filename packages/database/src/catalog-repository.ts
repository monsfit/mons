import { Context, Effect, Layer, Schema } from 'effect'
import { SqlClient, SqlError } from 'effect/unstable/sql'

import { validateSchemaName } from './migrations.ts'
import type { DatasetKind } from './types.ts'

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
  ingestion_run_id: Schema.String,
  name: Schema.String,
  nutrients: Schema.Array(foodNutrientRecordSchema),
  portions: Schema.Array(foodPortionRecordSchema),
  protein: Schema.NullOr(Schema.Number),
  source: Schema.String,
  source_id: Schema.String,
  total_fat: Schema.NullOr(Schema.Number),
})

const catalogSnapshotRecordSchema = Schema.Struct({
  active: Schema.Boolean,
  brandedFoods: Schema.Number,
  completedAt: Schema.NullOr(Schema.Date),
  rawFoods: Schema.Number,
  schemaVersion: Schema.NullOr(Schema.String),
  snapshotId: Schema.NullOr(Schema.String),
})

export type FoodPortionRecord = typeof foodPortionRecordSchema.Type
export type FoodNutrientRecord = typeof foodNutrientRecordSchema.Type
export type FoodRecord = typeof foodRecordSchema.Type
export type CatalogSnapshotRecord = typeof catalogSnapshotRecordSchema.Type

export interface FoodSearchOptions {
  readonly kind?: DatasetKind
  readonly limit: number
  readonly query: string
}

type CatalogReaderError = SqlError.SqlError | Schema.SchemaError

export interface CatalogReaderService {
  readonly findByGtin: (gtin: string) => Effect.Effect<FoodRecord | undefined, CatalogReaderError>
  readonly getStatus: Effect.Effect<CatalogSnapshotRecord, CatalogReaderError>
  readonly search: (
    options: FoodSearchOptions,
  ) => Effect.Effect<ReadonlyArray<FoodRecord>, CatalogReaderError>
}

export const CatalogReader = Context.Service<CatalogReaderService>(
  '@regolith/database/CatalogReader',
)

const decodeFoodRows = Schema.decodeUnknownEffect(Schema.Array(foodRecordSchema))

export const makeCatalogReader = (schema = 'regolith') =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const safeSchema = yield* validateSchemaName(schema)
    const foods = sql(`${safeSchema}.foods`)
    const brandedFoods = sql(`${safeSchema}.branded_foods`)
    const ingestionRuns = sql(`${safeSchema}.ingestion_runs`)

    const selectedFoodColumns = (tableAlias: string) =>
      sql.literal(`
      f.brand,
      f.calories,
      coalesce(f.carbohydrates_total, f.carbohydrates_available) AS carbohydrates_total,
      f.dataset_kind,
      f.food_id,
      f.gtin,
      f.ingestion_run_id,
      f.name,
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
      f.protein,
      coalesce((
        SELECT json_agg(
          json_build_object('amount', portion.amount, 'name', portion.name, 'unit', portion.unit)
          ORDER BY portion.ordinal
        )
        FROM ${safeSchema}.portions AS portion
        WHERE portion.dataset_kind = f.dataset_kind AND portion.food_id = f.food_id
      ), '[]'::json) AS portions,
      f.source,
      f.source_id,
      f.total_fat
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

    const getStatus = Effect.fn('CatalogReader.getStatus')(function* () {
      const [runs, counts] = yield* Effect.all(
        [
          sql<{
            readonly completed_at: Date | null
            readonly run_id: string
            readonly schema_version: string
          }>`SELECT run_id, schema_version, completed_at
             FROM ${ingestionRuns}
             WHERE status = 'success'
             ORDER BY started_at DESC
             LIMIT 1`,
          sql<{ readonly count: string; readonly dataset_kind: DatasetKind }>`
            SELECT dataset_kind, count(*) AS count FROM ${foods} GROUP BY dataset_kind
          `,
        ],
        { concurrency: 2 },
      )
      const run = runs[0]
      const countByKind = new Map(counts.map((row) => [row.dataset_kind, Number(row.count)]))
      return yield* Schema.decodeUnknownEffect(catalogSnapshotRecordSchema)({
        active: run !== undefined,
        brandedFoods: countByKind.get('branded') ?? 0,
        completedAt: run?.completed_at ?? null,
        rawFoods: countByKind.get('raw') ?? 0,
        schemaVersion: run?.schema_version ?? null,
        snapshotId: run?.run_id ?? null,
      })
    })()

    const search = Effect.fn('CatalogReader.search')(function* (options: FoodSearchOptions) {
      const kind =
        options.kind === undefined ? sql.literal('TRUE') : sql`f.dataset_kind = ${options.kind}`
      yield* Effect.annotateCurrentSpan({
        'catalog.search.dataset_kind': options.kind ?? 'all',
        'catalog.search.limit': options.limit,
        'catalog.search.query_length': options.query.length,
      })

      const fullTextRows = yield* sql`
        SELECT ${selectedFoodColumns('f')}
        FROM ${foods} AS f
        WHERE f.search_document @@ websearch_to_tsquery('simple', ${options.query})
          AND ${validFood}
          AND ${kind}
        ORDER BY
          ts_rank_cd(f.search_document, websearch_to_tsquery('simple', ${options.query})) DESC,
          ${sourcePriority} ASC,
          greatest(similarity(f.name, ${options.query}), similarity(coalesce(f.brand, ''), ${options.query})) DESC,
          f.food_id ASC
        LIMIT ${options.limit}
      `
      const fullTextMatches = yield* decodeFoodRows(fullTextRows)
      if (fullTextMatches.length >= options.limit) {
        yield* Effect.annotateCurrentSpan('catalog.search.fuzzy_fallback', false)
        return fullTextMatches
      }

      yield* Effect.annotateCurrentSpan('catalog.search.fuzzy_fallback', true)
      const brandedBrandCandidates =
        options.kind === 'raw'
          ? sql.literal('')
          : sql`
              UNION
              SELECT f.dataset_kind, f.food_id
              FROM ${brandedFoods} AS f
              WHERE f.brand % ${options.query}
                AND NOT (
                  f.search_document @@ websearch_to_tsquery('simple', ${options.query})
                )
                AND ${validFood}
            `
      const fuzzyRows = yield* sql`
        WITH fuzzy_candidates AS (
          SELECT f.dataset_kind, f.food_id
          FROM ${foods} AS f
          WHERE f.name % ${options.query}
            AND NOT (
              f.search_document @@ websearch_to_tsquery('simple', ${options.query})
            )
            AND ${validFood}
            AND ${kind}
          ${brandedBrandCandidates}
        )
        SELECT ${selectedFoodColumns('f')}
        FROM ${foods} AS f
        INNER JOIN fuzzy_candidates AS candidate
          ON candidate.dataset_kind = f.dataset_kind
          AND candidate.food_id = f.food_id
        ORDER BY
          greatest(
            similarity(f.name, ${options.query}),
            similarity(coalesce(f.brand, ''), ${options.query})
          ) DESC,
          ${sourcePriority} ASC,
          f.food_id ASC
        LIMIT ${options.limit - fullTextMatches.length}
      `
      const fuzzyMatches = yield* decodeFoodRows(fuzzyRows)
      return [...fullTextMatches, ...fuzzyMatches]
    })

    return CatalogReader.of({ findByGtin, getStatus, search })
  })

export const catalogReaderLayer = (schema = 'regolith') =>
  Layer.effect(CatalogReader, makeCatalogReader(schema))
