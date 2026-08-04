import SwiftUI

struct FoodNutritionMetricsGrid: View {
    let food: CatalogFood
    let quantityGrams: Double

    var body: some View {
        Grid(alignment: .leading, horizontalSpacing: MonsSpacing.xLarge, verticalSpacing: MonsSpacing.medium) {
            GridRow {
                FoodNutritionMetric(
                    title: "Calories",
                    value: food.scaled(food.calories, quantityGrams: quantityGrams),
                    unit: "kcal",
                    color: NutritionColor.calories,
                    isPrimary: true
                )
                FoodNutritionMetric(
                    title: "Protein",
                    value: food.scaled(food.protein, quantityGrams: quantityGrams),
                    unit: "g",
                    color: NutritionColor.protein
                )
            }
            GridRow {
                FoodNutritionMetric(
                    title: "Fat",
                    value: food.scaled(food.totalFat, quantityGrams: quantityGrams),
                    unit: "g",
                    color: NutritionColor.fat
                )
                FoodNutritionMetric(
                    title: "Carbs",
                    value: food.scaled(food.carbohydrates, quantityGrams: quantityGrams),
                    unit: "g",
                    color: NutritionColor.carbohydrates
                )
            }
        }
    }
}

