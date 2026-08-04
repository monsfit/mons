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
      .selectAll()
      .where('gtin', '=', gtin)
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
    let query = this.catalog()
      .selectFrom('foods')
      .selectAll()
      .where('name', 'ilike', `%${options.query}%`)

    if (options.kind !== undefined) {
      query = query.where('dataset_kind', '=', options.kind)
    }

    return query
      .orderBy(sql<number>`similarity(name, ${options.query})`, 'desc')
      .orderBy('food_id', 'asc')
      .limit(options.limit)
      .execute()
  }

  private catalog(): Kysely<CatalogDatabase> {
    return this.database.withSchema(this.schema)
  }
}
