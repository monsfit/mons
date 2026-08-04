import type { ColumnType, Generated, JSONColumnType } from 'kysely'

export type DatasetKind = 'raw' | 'branded'

export interface FoodTable {
  brand: string | null
  calories: number | null
  dataset_kind: DatasetKind
  food_id: Generated<string>
  gtin: string | null
  ingestion_run_id: string
  name: string
  protein: number | null
  source: string
  source_id: string
  total_fat: number | null
}

export interface IngestionRunTable {
  branded_manifest: JSONColumnType<Record<string, unknown>>
  branded_rows: ColumnType<string, never, never>
  completed_at: ColumnType<Date | null, never, never>
  package_version: string
  raw_manifest: JSONColumnType<Record<string, unknown>>
  raw_rows: ColumnType<string, never, never>
  run_id: string
  schema_version: string
  started_at: ColumnType<Date, never, never>
  status: 'loading' | 'success'
}

export interface CatalogDatabase {
  branded_foods: FoodTable
  foods: FoodTable
  ingestion_runs: IngestionRunTable
  raw_foods: FoodTable
}
