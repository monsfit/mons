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

  it('rejects out-of-range identifiers without silently truncating them', () => {
    for (const brandId of ['0', '-1', '01', '9223372036854775808', '123456789012345678901']) {
      expect(parseCatalogSearch({ brandId }).brandId).toBe('all')
    }
    expect(parseCatalogSearch({ brandId: '9223372036854775807' }).brandId).toBe(
      '9223372036854775807',
    )
  })

  it('formats catalog totals and nutrients for dense tables', () => {
    expect(formatCompactCount(2_785_392)).toBe('2.8M')
    expect(formatNutrient(0.45)).toBe('0.5 g')
    expect(formatNutrient(null)).toBe('—')
  })
})
