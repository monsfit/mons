import SwiftUI

struct FoodNutritionSummary: View {
    let food: CatalogFood
    let quantityGrams: Double

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(alignment: .top, spacing: 24) {
                metrics
            }

            Grid(alignment: .leading, horizontalSpacing: 32, verticalSpacing: 16) {
                GridRow {
                    calorieMetric
                    proteinMetric
                }
                GridRow {
                    fatMetric
                    carbohydrateMetric
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private var metrics: some View {
        calorieMetric
        Spacer(minLength: 0)
        proteinMetric
        fatMetric
        carbohydrateMetric
    }

    private var calorieMetric: some View {
        FoodNutritionMetric(
            title: "Calories",
            value: food.scaled(food.calories, quantityGrams: quantityGrams),
            unit: "kcal",
            color: NutritionColor.calories,
            isPrimary: true
        )
    }

    private var proteinMetric: some View {
        FoodNutritionMetric(
            title: "Protein",
            value: food.scaled(food.protein, quantityGrams: quantityGrams),
            unit: "g",
            color: NutritionColor.protein
        )
    }

    private var fatMetric: some View {
        FoodNutritionMetric(
            title: "Fat",
            value: food.scaled(food.totalFat, quantityGrams: quantityGrams),
            unit: "g",
            color: NutritionColor.fat
        )
    }

    private var carbohydrateMetric: some View {
        FoodNutritionMetric(
            title: "Carbs",
            value: food.scaled(food.carbohydrates, quantityGrams: quantityGrams),
            unit: "g",
            color: NutritionColor.carbohydrates
        )
    }
}
