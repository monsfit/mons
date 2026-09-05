import type { FoodRecord } from '@mons/database'

export const DAILY_VALUE_SOURCE =
  'https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels'

export function formatNutritionAmount(amount: number | null, unit = 'g'): string {
  return amount === null
    ? '—'
    : `${amount.toLocaleString('en-US', { maximumSignificantDigits: 4 })} ${unit}`.trim()
}

const dailyValues: Readonly<Record<string, { amount: number; unit: string }>> = {
  total_fat: { amount: 78, unit: 'g' },
  saturated_fat: { amount: 20, unit: 'g' },
  carbohydrates_total: { amount: 275, unit: 'g' },
  fiber: { amount: 28, unit: 'g' },
  added_sugars: { amount: 50, unit: 'g' },
  dietary_cholesterol: { amount: 300, unit: 'mg' },
  sodium: { amount: 2300, unit: 'mg' },
  calcium: { amount: 1300, unit: 'mg' },
  iron: { amount: 18, unit: 'mg' },
  potassium: { amount: 4700, unit: 'mg' },
  magnesium: { amount: 420, unit: 'mg' },
  phosphorus: { amount: 1250, unit: 'mg' },
  zinc: { amount: 11, unit: 'mg' },
  copper: { amount: 0.9, unit: 'mg' },
  manganese: { amount: 2.3, unit: 'mg' },
  selenium: { amount: 55, unit: 'mcg' },
  choline: { amount: 550, unit: 'mg' },
  folate_dfe: { amount: 400, unit: 'mcg' },
  vitamin_b1_thiamin: { amount: 1.2, unit: 'mg' },
  vitamin_b2_riboflavin: { amount: 1.3, unit: 'mg' },
  vitamin_b5_pantothenic_acid: { amount: 5, unit: 'mg' },
  vitamin_b6: { amount: 1.7, unit: 'mg' },
  vitamin_b12_cobalamin: { amount: 2.4, unit: 'mcg' },
  vitamin_c_ascorbic_acid: { amount: 90, unit: 'mg' },
  vitamin_d_calciferol: { amount: 20, unit: 'mcg' },
  vitamin_k_phylloquinone: { amount: 120, unit: 'mcg' },
}

export function dailyValuePercent(field: string, amount: number, unit: string): number | null {
  const reference = dailyValues[field]
  return reference === undefined || reference.unit !== unit
    ? null
    : (amount / reference.amount) * 100
}

const aminoAcids = new Set([
  'cysteine',
  'histidine',
  'isoleucine',
  'leucine',
  'lysine',
  'methionine',
  'phenylalanine',
  'threonine',
  'tryptophan',
  'tyrosine',
  'valine',
])
const carbs = new Set([
  'carbohydrates_total',
  'carbohydrates_available',
  'carbohydrates_net_calculated',
  'fiber',
  'starch',
  'total_sugars',
  'added_sugars',
])
const minerals = new Set([
  'calcium',
  'copper',
  'iron',
  'manganese',
  'magnesium',
  'phosphorus',
  'potassium',
  'selenium',
  'sodium',
  'zinc',
])

export function nutrientGroup(field: string): string {
  if (carbs.has(field)) return 'Carbohydrates'
  if (field.includes('fat') || field.startsWith('omega_') || field === 'dietary_cholesterol')
    return 'Fats'
  if (field === 'protein') return 'Protein'
  if (aminoAcids.has(field)) return 'Amino acids'
  if (field.startsWith('vitamin_') || field.startsWith('folate_') || field === 'choline')
    return 'Vitamins & choline'
  if (minerals.has(field)) return 'Minerals'
  return 'Other nutrients'
}

export function nutritionPortions(food: Pick<FoodRecord, 'nutrient_basis' | 'portions'>) {
  const basis = food.nutrient_basis
  return [
    { id: 'basis', label: `${basis.amount} ${basis.unit} (source basis)`, scale: 1 },
    ...food.portions.flatMap((portion, index) =>
      portion.unit !== basis.unit
        ? []
        : [
            {
              id: String(index),
              label: `${portion.name} (${portion.amount} ${portion.unit})`,
              scale: portion.amount / basis.amount,
            },
          ],
    ),
  ]
}
