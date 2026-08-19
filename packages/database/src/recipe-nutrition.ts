export interface NutritionValues {
  readonly calories: number | null
  readonly carbohydrates: number | null
  readonly protein: number | null
  readonly totalFat: number | null
}

export interface WeightedNutritionValues extends NutritionValues {
  readonly quantityGrams: number
}

export interface RecipeNutrition extends NutritionValues {
  readonly status: 'calculated' | 'estimate_pending' | 'mixed'
}

const fields = ['calories', 'carbohydrates', 'protein', 'totalFat'] as const

export const calculateRecipeNutrition = (
  ingredients: ReadonlyArray<WeightedNutritionValues>,
  freeformEstimates: ReadonlyArray<NutritionValues>,
  totalYieldGrams: number,
): RecipeNutrition => {
  const hasPendingEstimate = freeformEstimates.some((estimate) =>
    fields.some((field) => estimate[field] === null),
  )
  const total = (field: (typeof fields)[number]): number | null => {
    const ingredientValues = ingredients.map((ingredient) => {
      const value = ingredient[field]
      return value === null ? null : (value * ingredient.quantityGrams) / 100
    })
    const freeformValues = freeformEstimates.map((estimate) => estimate[field])
    const values = [...ingredientValues, ...freeformValues]
    if (values.some((value) => value === null)) return null
    const sum = values.reduce<number>((result, value) => result + (value ?? 0), 0)
    return Math.round(((sum * 100) / totalYieldGrams) * 1000) / 1000
  }

  const nutrition: NutritionValues = {
    calories: total('calories'),
    carbohydrates: total('carbohydrates'),
    protein: total('protein'),
    totalFat: total('totalFat'),
  }

  return {
    ...nutrition,
    status:
      freeformEstimates.length === 0
        ? 'calculated'
        : hasPendingEstimate
          ? 'estimate_pending'
          : 'mixed',
  }
}
