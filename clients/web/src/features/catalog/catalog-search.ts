export type CatalogDatasetKind = 'raw' | 'branded' | 'restaurant'

export interface CatalogSearch {
  readonly brandId: string
  readonly brandName: string
  readonly brandQuery: string
  readonly foodGroupId: string
  readonly kind: CatalogDatasetKind | 'all'
  readonly q: string
  readonly restaurantId: string
  readonly restaurantName: string
  readonly restaurantQuery: string
}

const readText = (value: unknown, fallback: string, maximumLength = 200) =>
  typeof value === 'string' && value.trim().length > 0
    ? value.trim().slice(0, maximumLength)
    : fallback

const readId = (value: unknown) => {
  const candidate = readText(value, 'all', 19)
  return candidate === 'all' || /^\d{1,19}$/.test(candidate) ? candidate : 'all'
}

export function parseCatalogSearch(search: Record<string, unknown>): CatalogSearch {
  const candidateKind = readText(search.kind, 'all')
  const candidateQuery = readText(search.q, 'chicken')
  const kind =
    candidateKind === 'raw' || candidateKind === 'branded' || candidateKind === 'restaurant'
      ? candidateKind
      : 'all'

  return {
    brandId: readId(search.brandId),
    brandName: readText(search.brandName, '', 160),
    brandQuery: readText(search.brandQuery, '', 160),
    foodGroupId: readId(search.foodGroupId),
    kind,
    q: candidateQuery.length >= 2 ? candidateQuery : 'chicken',
    restaurantId: readId(search.restaurantId),
    restaurantName: readText(search.restaurantName, '', 160),
    restaurantQuery: readText(search.restaurantQuery, '', 160),
  }
}

export function toCatalogQuery(search: CatalogSearch) {
  return {
    q: search.q,
    ...(search.brandId === 'all' ? {} : { brandId: search.brandId }),
    ...(search.brandQuery.length === 0 ? {} : { brandQuery: search.brandQuery }),
    ...(search.foodGroupId === 'all' ? {} : { foodGroupId: search.foodGroupId }),
    ...(search.kind === 'all' ? {} : { kind: search.kind }),
    ...(search.restaurantId === 'all' ? {} : { restaurantId: search.restaurantId }),
    ...(search.restaurantQuery.length === 0
      ? {}
      : {
          restaurantQuery: search.restaurantQuery,
        }),
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
