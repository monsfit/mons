export type CatalogDatasetKind = 'raw' | 'branded' | 'restaurant'
export interface CatalogFilter {
  readonly id: string
  readonly name: string
}
export interface CatalogSearch {
  readonly brands: ReadonlyArray<CatalogFilter>
  readonly groups: ReadonlyArray<CatalogFilter>
  readonly restaurants: ReadonlyArray<CatalogFilter>
  readonly kinds: ReadonlyArray<CatalogDatasetKind>
  readonly brandQuery: string
  readonly restaurantQuery: string
  readonly q: string
}
export type CatalogSearchUpdate =
  | Partial<CatalogSearch>
  | ((current: CatalogSearch) => CatalogSearch)
export const isCatalogId = (value: string): boolean =>
  /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9_223_372_036_854_775_807n
const readText = (value: unknown, maximumLength = 160) =>
  typeof value === 'string' ? value.trim().slice(0, maximumLength) : ''
const isKind = (value: unknown): value is CatalogDatasetKind =>
  value === 'raw' || value === 'branded' || value === 'restaurant'
function readFilters(
  value: unknown,
  legacyId: unknown,
  legacyName: unknown,
): ReadonlyArray<CatalogFilter> {
  const candidates: ReadonlyArray<unknown> = Array.isArray(value)
    ? value
    : [{ id: legacyId, name: legacyName }]
  const result = new Map<string, CatalogFilter>()
  for (const candidate of candidates.slice(0, 50)) {
    if (typeof candidate !== 'object' || candidate === null || !('id' in candidate)) continue
    if (typeof candidate.id !== 'string' || !isCatalogId(candidate.id)) continue
    const name = 'name' in candidate ? readText(candidate.name) : ''
    result.set(candidate.id, { id: candidate.id, name: name || candidate.id })
  }
  return [...result.values()]
}
export function parseCatalogSearch(search: Record<string, unknown>): CatalogSearch {
  const q = readText(search.q, 200)
  return {
    brands: readFilters(search.brands, search.brandId, search.brandName),
    groups: readFilters(search.groups, search.foodGroupId, ''),
    restaurants: readFilters(search.restaurants, search.restaurantId, search.restaurantName),
    kinds: [
      ...new Set((Array.isArray(search.kinds) ? search.kinds : [search.kind]).filter(isKind)),
    ],
    brandQuery: readText(search.brandQuery),
    restaurantQuery: readText(search.restaurantQuery),
    q: q.length === 1 ? '' : q,
  }
}
export function toggleFilter(
  items: ReadonlyArray<CatalogFilter>,
  item: CatalogFilter,
): ReadonlyArray<CatalogFilter> {
  return items.some((candidate) => candidate.id === item.id)
    ? items.filter((candidate) => candidate.id !== item.id)
    : [...items, item].slice(0, 50)
}
export function toCatalogQuery(search: CatalogSearch) {
  return {
    q: search.q,
    brandIds: search.brands.map((item) => item.id),
    foodGroupIds: search.groups.map((item) => item.id),
    restaurantIds: search.restaurants.map((item) => item.id),
    kinds: search.kinds,
    brandQuery: search.brandQuery,
    restaurantQuery: search.restaurantQuery,
  }
}

export function formatCompactCount(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
    notation: value >= 1_000 ? 'compact' : 'standard',
  }).format(value)
}

export function formatNutrient(value: number | null, unit = 'g'): string {
  if (value === null) return '—'
  const fractionDigits = Number.isInteger(value) ? 0 : 1
  return `${value.toLocaleString('en-US', { maximumFractionDigits: fractionDigits })} ${unit}`
}
