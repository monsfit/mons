import { describe, expect, it } from 'vitest'

import {
  formatCompactCount,
  formatNutrient,
  parseCatalogSearch,
  toCatalogQuery,
  toggleFilter,
} from './catalog-search'

describe('catalog search presentation', () => {
  it('normalizes multiple selections without duplicates or invalid identifiers', () => {
    const search = parseCatalogSearch({
      kinds: ['raw', 'branded', 'raw', 'invalid'],
      brands: [
        { id: '1', name: ' One ' },
        { id: '1', name: 'One' },
        { id: '-2', name: 'Invalid' },
      ],
    })
    expect(search.kinds).toEqual(['raw', 'branded'])
    expect(search.brands).toEqual([{ id: '1', name: 'One' }])
    expect(toggleFilter(search.brands, { id: '2', name: 'Two' })).toHaveLength(2)
    expect(toggleFilter(search.brands, { id: '1', name: 'One' })).toEqual([])
  })
  it('preserves an explicitly cleared query instead of restoring chicken', () => {
    expect(parseCatalogSearch({ q: '' }).q).toBe('')
    expect(parseCatalogSearch({ q: '   ' }).q).toBe('')
    expect(toCatalogQuery(parseCatalogSearch({ q: '' })).q).toBe('')
  })
  it('defaults to browsing with no text query', () => {
    expect(parseCatalogSearch({})).toEqual({
      brands: [],
      brandQuery: '',
      groups: [],
      kinds: [],
      q: '',
      restaurants: [],
      restaurantQuery: '',
    })
  })

  it('drops unsupported dataset kinds and trims text', () => {
    expect(
      parseCatalogSearch({ brandId: 'oops', foodGroupId: '-1', kind: 'private', q: '  salmon  ' }),
    ).toMatchObject({
      brands: [],
      groups: [],
      kinds: [],
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
      brandIds: ['12'],
      foodGroupIds: [],
      restaurantIds: [],
      kinds: ['branded'],
      brandQuery: 'ann',
      restaurantQuery: '',
      q: 'cookies',
    })
  })

  it('rejects out-of-range identifiers without silently truncating them', () => {
    for (const brandId of ['0', '-1', '01', '9223372036854775808', '123456789012345678901']) {
      expect(parseCatalogSearch({ brandId }).brands).toEqual([])
    }
    expect(parseCatalogSearch({ brandId: '9223372036854775807' }).brands[0]?.id).toBe(
      '9223372036854775807',
    )
  })

  it('formats catalog totals and nutrients for dense tables', () => {
    expect(formatCompactCount(2_785_392)).toBe('2.8M')
    expect(formatNutrient(0.45)).toBe('0.5 g')
    expect(formatNutrient(null)).toBe('—')
  })
})
