import { describe, expect, it } from 'vitest'

import { getCatalogSource } from './catalog-sources'

describe('catalog source presentation', () => {
  it('marks curated scientific composition sources as verified', () => {
    expect(getCatalogSource('usda_fooddata_central_foundation')).toEqual({
      label: 'USDA Foundation Foods',
      abbreviation: 'USDA Foundation',
      verified: true,
    })
    expect(getCatalogSource('canadian_nutrient_file').verified).toBe(true)
  })

  it('does not verify community or manufacturer label data', () => {
    expect(getCatalogSource('open_food_facts').verified).toBe(false)
    expect(getCatalogSource('usda_fooddata_central_branded').verified).toBe(false)
  })
})
