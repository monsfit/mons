import type { CatalogFood } from './catalog-functions'
import { formatNutrient } from './catalog-search'

export function foodAttribution(food: CatalogFood): string | null {
  if (food.brand !== null) return `by ${food.brand}`
  if (food.restaurant !== null) return `at ${food.restaurant}`
  return null
}

export function foodPortionLabel(food: CatalogFood): string {
  const portion = food.defaultPortion
  if (portion === null || portion.unit !== food.nutrientBasis.unit) {
    return `${food.nutrientBasis.amount.toLocaleString('en-US')} ${food.nutrientBasis.unit}`
  }
  if (portion.unit === 'serving') return portion.name
  const includesMeasuredQuantity =
    portion.unit === 'g'
      ? /\d(?:[\d.,]*?)\s*(?:g|gram|grams)\b/i.test(portion.name)
      : /\d(?:[\d.,]*?)\s*(?:ml|milliliter|milliliters|millilitre|millilitres)\b/i.test(
          portion.name,
        )
  if (includesMeasuredQuantity) return portion.name
  return `${portion.name}, ${portion.amount.toLocaleString('en-US')} ${portion.unit}`
}

export function formatFoodNutrient(food: CatalogFood, value: number | null, unit = 'g'): string {
  return formatNutrient(foodNutrientAmount(food, value), unit)
}

export function foodNutrientAmount(food: CatalogFood, value: number | null): number | null {
  if (value === null) return null
  const portion = food.defaultPortion
  if (portion === null || portion.unit !== food.nutrientBasis.unit) {
    return value
  }
  return value * (portion.amount / food.nutrientBasis.amount)
}
