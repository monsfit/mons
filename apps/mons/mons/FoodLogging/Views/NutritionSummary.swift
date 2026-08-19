import SwiftUI

struct NutritionSummary: View {
    let calories: Double
    let protein: Double
    let totalFat: Double
    let carbohydrates: Double

    init(
        calories: Double,
        protein: Double,
        totalFat: Double,
        carbohydrates: Double
    ) {
        self.calories = calories
        self.protein = protein
        self.totalFat = totalFat
        self.carbohydrates = carbohydrates
    }

    init(food: CatalogFood, quantityGrams: Double) {
        calories = food.scaled(food.calories, quantityGrams: quantityGrams)
        protein = food.scaled(food.protein, quantityGrams: quantityGrams)
        totalFat = food.scaled(food.totalFat, quantityGrams: quantityGrams)
        carbohydrates = food.scaled(food.carbohydrates, quantityGrams: quantityGrams)
    }

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(alignment: .top, spacing: MonsSpacing.large) {
                FoodNutritionMetric(
                    title: "Calories",
                    value: calories,
                    unit: "kcal",
                    color: MonsColor.metric,
                    isPrimary: true
                )

                Spacer(minLength: 0)

                FoodNutritionMetric(
                    title: "Protein",
                    value: protein,
                    unit: "g",
                    color: MonsColor.proteinAccent
                )
                FoodNutritionMetric(
                    title: "Fat",
                    value: totalFat,
                    unit: "g",
                    color: MonsColor.fatAccent
                )
                FoodNutritionMetric(
                    title: "Carbs",
                    value: carbohydrates,
                    unit: "g",
                    color: MonsColor.carbohydrateAccent
                )
            }

            Grid(alignment: .leading, horizontalSpacing: MonsSpacing.xLarge, verticalSpacing: MonsSpacing.large) {
                GridRow {
                    FoodNutritionMetric(
                        title: "Calories",
                        value: calories,
                        unit: "kcal",
                        color: MonsColor.metric,
                        isPrimary: true
                    )
                    FoodNutritionMetric(
                        title: "Protein",
                        value: protein,
                        unit: "g",
                        color: MonsColor.proteinAccent
                    )
                }
                GridRow {
                    FoodNutritionMetric(
                        title: "Fat",
                        value: totalFat,
                        unit: "g",
                        color: MonsColor.fatAccent
                    )
                    FoodNutritionMetric(
                        title: "Carbs",
                        value: carbohydrates,
                        unit: "g",
                        color: MonsColor.carbohydrateAccent
                    )
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
