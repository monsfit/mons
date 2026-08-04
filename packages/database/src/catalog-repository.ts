import { sql, type Kysely, type Selectable } from 'kysely'

import type { CatalogDatabase, DatasetKind, FoodTable } from './types.js'

export type FoodRecord = Selectable<FoodTable>

export interface CatalogSnapshotRecord {
  active: boolean
  brandedFoods: number
  completedAt: Date | null
  rawFoods: number
  schemaVersion: string | null
  snapshotId: string | null
}

export interface FoodSearchOptions {
  kind?: DatasetKind
  limit: number
  query: string
}

export interface CatalogReader {
  findByGtin(gtin: string): Promise<FoodRecord | undefined>
  getStatus(): Promise<CatalogSnapshotRecord>
  search(options: FoodSearchOptions): Promise<FoodRecord[]>
}

function validFoodPredicate() {
  return sql<boolean>`
    char_length(name) <= 160
    AND calories IS NOT NULL
    AND calories BETWEEN 0 AND 1000
    AND protein IS NOT NULL
    AND protein BETWEEN 0 AND 100
    AND total_fat IS NOT NULL
    AND total_fat BETWEEN 0 AND 100
    AND coalesce(carbohydrates_total, carbohydrates_available) IS NOT NULL
    AND coalesce(carbohydrates_total, carbohydrates_available) BETWEEN 0 AND 100
    AND protein + total_fat + coalesce(carbohydrates_total, carbohydrates_available) <= 120
    AND (
      calories > 0
      OR protein + total_fat + coalesce(carbohydrates_total, carbohydrates_available) = 0
    )
    AND (dataset_kind = 'raw' OR gtin IS NOT NULL)
  `
}

export class KyselyCatalogReader implements CatalogReader {
  private readonly database: Kysely<CatalogDatabase>
  private readonly schema: string

  constructor(database: Kysely<CatalogDatabase>, schema = 'regolith') {
    this.database = database
    this.schema = schema
  }

  async findByGtin(gtin: string): Promise<FoodRecord | undefined> {
    return this.catalog()
      .selectFrom('branded_foods')
      .select([
        'brand',
        'calories',
        sql<number | null>`coalesce(carbohydrates_total, carbohydrates_available)`.as(
          'carbohydrates_total',
        ),
        'dataset_kind',
        'food_id',
        'gtin',
        'ingestion_run_id',
        'name',
        'protein',
        'source',
        'source_id',
        'total_fat',
      ])
      .where('gtin', '=', gtin)
      .where(validFoodPredicate())
      .executeTakeFirst()
  }

  async getStatus(): Promise<CatalogSnapshotRecord> {
    const catalog = this.catalog()
    const [run, counts] = await Promise.all([
      catalog
        .selectFrom('ingestion_runs')
        .select(['run_id', 'schema_version', 'completed_at'])
        .where('status', '=', 'success')
        .orderBy('started_at', 'desc')
        .executeTakeFirst(),
      catalog
        .selectFrom('foods')
        .select(['dataset_kind'])
        .select(({ fn }) => fn.countAll<string>().as('count'))
        .groupBy('dataset_kind')
        .execute(),
    ])

    const countByKind = new Map(counts.map((row) => [row.dataset_kind, Number(row.count)]))
    return {
      active: run !== undefined,
      brandedFoods: countByKind.get('branded') ?? 0,
      completedAt: run?.completed_at ?? null,
      rawFoods: countByKind.get('raw') ?? 0,
      schemaVersion: run?.schema_version ?? null,
      snapshotId: run?.run_id ?? null,
    }
  }

  async search(options: FoodSearchOptions): Promise<FoodRecord[]> {
    const fullTextQuery = sql`websearch_to_tsquery('simple', ${options.query})`
    let query = this.catalog()
      .selectFrom('foods')
      .select([
        'brand',
        'calories',
        sql<number | null>`coalesce(carbohydrates_total, carbohydrates_available)`.as(
          'carbohydrates_total',
        ),
        'dataset_kind',
        'food_id',
        'gtin',
        'ingestion_run_id',
        'name',
        'protein',
        'source',
        'source_id',
        'total_fat',
      ])
      .where(
        sql<boolean>`(search_document @@ ${fullTextQuery} OR name % ${options.query} OR coalesce(brand, '') % ${options.query})`,
      )
      .where(validFoodPredicate())

    if (options.kind !== undefined) {
      query = query.where('dataset_kind', '=', options.kind)
    }

    return query
      .orderBy(sql<number>`ts_rank_cd(search_document, ${fullTextQuery})`, 'desc')
      .orderBy(
        sql<number>`CASE source
          WHEN 'usda_fooddata_central_branded' THEN 0
          WHEN 'open_food_facts' THEN 1
          ELSE 2
        END`,
        'asc',
      )
      .orderBy(
        sql<number>`greatest(similarity(name, ${options.query}), similarity(coalesce(brand, ''), ${options.query}))`,
        'desc',
      )
      .orderBy('food_id', 'asc')
      .limit(options.limit)
      .execute()
  }

  private catalog(): Kysely<CatalogDatabase> {
    return this.database.withSchema(this.schema)
  }
}
