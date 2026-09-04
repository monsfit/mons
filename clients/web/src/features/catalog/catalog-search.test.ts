import { describe, expect, it } from 'vitest'

import { formatCompactCount, formatNutrient, parseCatalogSearch } from './catalog-search'

describe('catalog search presentation', () => {
  it('provides a useful deterministic first query', () => {
    expect(parseCatalogSearch({})).toEqual({
      brandId: 'all',
      brandName: '',
      brandQuery: '',
      foodGroupId: 'all',
      kind: 'all',
      q: 'chicken',
      restaurantId: 'all',
      restaurantName: '',
      restaurantQuery: '',
    })
  })

  it('drops unsupported dataset kinds and trims text', () => {
    expect(parseCatalogSearch({ kind: 'private', q: '  salmon  ' })).toMatchObject({
      kind: 'all',
      q: 'salmon',
    })
  })

  it('formats catalog totals and nutrients for dense tables', () => {
    expect(formatCompactCount(2_785_392)).toBe('2.8M')
    expect(formatNutrient(0.45)).toBe('0.5 g')
    expect(formatNutrient(null)).toBe('—')
  })
})
