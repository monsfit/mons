import SwiftUI

struct FoodTargetImpactRow: View {
    let food: CatalogFood
    let quantityGrams: Double
    let targets: NutritionTargets

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            FoodTargetImpactMetric(
                title: "Calories",
                value: food.scaled(food.calories, quantityGrams: quantityGrams),
                target: Double(targets.calories),
                color: NutritionColor.calories
            )
            FoodTargetImpactMetric(
                title: "Protein",
                value: food.scaled(food.protein, quantityGrams: quantityGrams),
                target: Double(targets.protein),
                color: NutritionColor.protein
            )
            FoodTargetImpactMetric(
                title: "Fat",
                value: food.scaled(food.totalFat, quantityGrams: quantityGrams),
                target: Double(targets.fat),
                color: NutritionColor.fat
            )
            FoodTargetImpactMetric(
                title: "Carbs",
                value: food.scaled(food.carbohydrates, quantityGrams: quantityGrams),
                target: Double(targets.carbohydrates),
                color: NutritionColor.carbohydrates
            )
        }
    }
}
