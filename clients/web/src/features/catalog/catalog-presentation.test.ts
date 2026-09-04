import { describe, expect, it } from 'vitest'

import type { CatalogFood } from './catalog-functions'
import { foodAttribution, foodPortionLabel, formatFoodNutrient } from './catalog-presentation'

const food: CatalogFood = {
  brand: "Annie's Homegrown",
  brandId: '1',
  calories: 400,
  carbohydrates: 60,
  datasetKind: 'branded',
  defaultPortion: { amount: 30, name: '6 cookies', unit: 'g' },
  foodGroup: 'Snacks',
  foodGroupId: '1',
  foodId: '1',
  foodSubgroup: null,
  foodSubgroupId: null,
  name: 'Bunny Cookies',
  nutrientBasis: { amount: 100, unit: 'g' },
  protein: 5,
  restaurant: null,
  restaurantId: null,
  source: 'usda_fooddata_central_branded',
  sourceId: '1',
  totalFat: 12,
}

describe('catalog food presentation', () => {
  it('presents a clean brand attribution and portion', () => {
    expect(foodAttribution(food)).toBe("by Annie's Homegrown")
    expect(foodPortionLabel(food)).toBe('6 cookies, 30 g')
  })

  it('scales nutrients to the displayed default portion', () => {
    expect(formatFoodNutrient(food, food.calories, 'kcal')).toBe('120 kcal')
    expect(formatFoodNutrient(food, food.protein)).toBe('1.5 g')
  })

  it('does not repeat a quantity already present in the portion name', () => {
    expect(
      foodPortionLabel({
        ...food,
        defaultPortion: { amount: 85, name: '1 portion (85 g)', unit: 'g' },
      }),
    ).toBe('1 portion (85 g)')
  })
})
