import { expect, it } from 'vitest'
import {
  dailyValuePercent,
  formatNutritionAmount,
  nutrientGroup,
  nutritionPortions,
} from './nutrition'

it('uses comparable nutrient forms and units only for daily values', () => {
  expect(dailyValuePercent('total_fat', 90, 'g')).toBeCloseTo(115.38)
  expect(dailyValuePercent('saturated_fat', 10, 'g')).toBe(50)
  expect(dailyValuePercent('saturated_fat', 10, 'mg')).toBeNull()
  expect(dailyValuePercent('folate_total', 100, 'mcg')).toBeNull()
  expect(dailyValuePercent('folate_dfe', 100, 'mcg')).toBe(25)
  expect(dailyValuePercent('protein', 20, 'g')).toBeNull()
  expect(dailyValuePercent('total_sugars', 20, 'g')).toBeNull()
})

it('distinguishes missing, zero and small reported amounts', () => {
  expect(formatNutritionAmount(null)).toBe('—')
  expect(formatNutritionAmount(0)).toBe('0 g')
  expect(formatNutritionAmount(0.000123, 'mg')).toBe('0.000123 mg')
  expect(formatNutritionAmount(1500, 'kcal')).toBe('1,500 kcal')
})

it('assigns nutrient families without confusing amino acids with vitamins', () => {
  expect(nutrientGroup('leucine')).toBe('Amino acids')
  expect(nutrientGroup('omega_3_ala')).toBe('Fats')
  expect(nutrientGroup('vitamin_b6')).toBe('Vitamins & choline')
})

it('does not invent density conversions for volume portions', () => {
  const options = nutritionPortions({
    nutrient_basis: { amount: 100, unit: 'g' },
    portions: [
      { amount: 30, unit: 'g', name: '6 cookies' },
      { amount: 250, unit: 'ml', name: '1 cup' },
    ],
  })
  expect(options).toEqual([
    { id: 'basis', label: '100 g (source basis)', scale: 1 },
    { id: '0', label: '6 cookies (30 g)', scale: 0.3 },
  ])
})
