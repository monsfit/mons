import type { FoodSummary } from '@mons/contracts'
import type { FoodRecord } from '@mons/database'

export function toFoodSummary(food: FoodRecord): FoodSummary {
  return {
    brand: food.brand,
    calories: food.calories,
    carbohydrates: food.carbohydrates_total,
    datasetKind: food.dataset_kind,
    foodId: food.food_id,
    gtin: food.gtin,
    name: food.name,
    nutrients: food.nutrients,
    portions: food.portions,
    protein: food.protein,
    source: food.source,
    sourceId: food.source_id,
    totalFat: food.total_fat,
  }
}
