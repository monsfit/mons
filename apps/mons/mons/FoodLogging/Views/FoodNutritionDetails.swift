import SwiftUI

struct FoodNutritionDetails: View {
    let food: CatalogFood

    var body: some View {
        VStack(spacing: 0) {
            FoodNutritionDetailRow(
                title: "Calories",
                value: food.calories ?? 0,
                unit: "kcal",
                color: NutritionColor.calories
            )
            FoodNutritionDetailRow(
                title: "Protein",
                value: food.protein ?? 0,
                unit: "g",
                color: NutritionColor.protein
            )
            FoodNutritionDetailRow(
                title: "Fat",
                value: food.totalFat ?? 0,
                unit: "g",
                color: NutritionColor.fat
            )
            FoodNutritionDetailRow(
                title: "Carbohydrates",
                value: food.carbohydrates ?? 0,
                unit: "g",
                color: NutritionColor.carbohydrates
            )
        }
        .background(MonsColor.surface, in: .rect(cornerRadius: MonsRadius.medium))
        .overlay {
            RoundedRectangle(cornerRadius: MonsRadius.medium)
                .stroke(MonsColor.border, lineWidth: 1)
        }
    }
}
