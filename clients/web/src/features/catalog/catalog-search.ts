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

export function parseCatalogSearch(search: Record<string, unknown>): CatalogSearch {
  const candidateKind = readText(search.kind, 'all')
  const kind =
    candidateKind === 'raw' || candidateKind === 'branded' || candidateKind === 'restaurant'
      ? candidateKind
      : 'all'

  return {
    brandId: readText(search.brandId, 'all', 19),
    brandName: readText(search.brandName, '', 160),
    brandQuery: readText(search.brandQuery, '', 160),
    foodGroupId: readText(search.foodGroupId, 'all', 19),
    kind,
    q: readText(search.q, 'chicken'),
    restaurantId: readText(search.restaurantId, 'all', 19),
    restaurantName: readText(search.restaurantName, '', 160),
    restaurantQuery: readText(search.restaurantQuery, '', 160),
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
