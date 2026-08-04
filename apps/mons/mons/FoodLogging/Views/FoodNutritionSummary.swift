import SwiftUI

struct FoodNutritionSummary: View {
    let food: CatalogFood
    let quantityGrams: Double

    var body: some View {
        ViewThatFits(in: .horizontal) {
            FoodNutritionMetricsRow(food: food, quantityGrams: quantityGrams)
            FoodNutritionMetricsGrid(food: food, quantityGrams: quantityGrams)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
