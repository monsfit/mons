import { describe, expect, it } from 'vitest'

import { calculateRecipeNutrition } from './recipe-nutrition.ts'

describe('calculateRecipeNutrition', () => {
  it('calculates per-100-gram nutrition from measured yield deterministically', () => {
    expect(
      calculateRecipeNutrition(
        [
          {
            calories: 100,
            carbohydrates: 20,
            protein: 5,
            quantityGrams: 200,
            totalFat: 2,
          },
          {
            calories: 200,
            carbohydrates: 10,
            protein: 20,
            quantityGrams: 100,
            totalFat: 10,
          },
        ],
        [],
        500,
      ),
    ).toEqual({
      calories: 80,
      carbohydrates: 10,
      protein: 6,
      status: 'calculated',
      totalFat: 2.8,
    })
  })

  it('keeps dumb recipes explicitly pending until estimates are supplied', () => {
    expect(
      calculateRecipeNutrition(
        [],
        [{ calories: null, carbohydrates: null, protein: null, totalFat: null }],
        600,
      ),
    ).toEqual({
      calories: null,
      carbohydrates: null,
      protein: null,
      status: 'estimate_pending',
      totalFat: null,
    })
  })
})
