import SwiftUI

struct FoodNutritionMetricsRow: View {
    let food: CatalogFood
    let quantityGrams: Double

    var body: some View {
        HStack(alignment: .top, spacing: MonsSpacing.large) {
            FoodNutritionMetric(
                title: "Calories",
                value: food.scaled(food.calories, quantityGrams: quantityGrams),
                unit: "kcal",
                color: NutritionColor.calories,
                isPrimary: true
            )
            Spacer(minLength: 0)
            FoodNutritionMetric(
                title: "Protein",
                value: food.scaled(food.protein, quantityGrams: quantityGrams),
                unit: "g",
                color: NutritionColor.protein
            )
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

