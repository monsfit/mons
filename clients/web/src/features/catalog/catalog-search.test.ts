import { describe, expect, it } from 'vitest'

import {
  formatCompactCount,
  formatNutrient,
  parseCatalogSearch,
  toCatalogQuery,
} from './catalog-search'

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
    expect(
      parseCatalogSearch({ brandId: 'oops', foodGroupId: '-1', kind: 'private', q: '  salmon  ' }),
    ).toMatchObject({
      brandId: 'all',
      foodGroupId: 'all',
      kind: 'all',
      q: 'salmon',
    })
  })

  it('builds a bounded server query from active filters', () => {
    const search = parseCatalogSearch({
      brandId: '12',
      brandQuery: 'ann',
      kind: 'branded',
      q: 'cookies',
    })
    expect(toCatalogQuery(search)).toEqual({
      brandId: '12',
      brandQuery: 'ann',
      kind: 'branded',
      q: 'cookies',
    })
  })

  it('formats catalog totals and nutrients for dense tables', () => {
    expect(formatCompactCount(2_785_392)).toBe('2.8M')
    expect(formatNutrient(0.45)).toBe('0.5 g')
    expect(formatNutrient(null)).toBe('—')
  })
})
