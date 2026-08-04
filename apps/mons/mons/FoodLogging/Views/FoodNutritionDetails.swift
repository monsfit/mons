import SwiftUI

struct FoodNutritionDetails: View {
    let food: CatalogFood
    let quantityGrams: Double
    let targets: NutrientReferenceTargets

    var body: some View {
        VStack(alignment: .leading, spacing: MonsSpacing.xLarge) {
            ForEach(FoodNutrientGroup.allCases) { group in
                let nutrients = FoodNutrientPresentation.nutrients(scaledNutrients, in: group)
                if !nutrients.isEmpty {
                    FoodNutritionSection(group: group, nutrients: nutrients, targets: targets)
                }
            }
        }
    }

    private var scaledNutrients: [FoodNutrient] {
        let scale = max(quantityGrams, 0) / 100
        return food.availableNutrients.map { nutrient in
            FoodNutrient(
                amount: nutrient.amount * scale,
                field: nutrient.field,
                name: nutrient.name,
                unit: nutrient.unit
            )
        }
    }
}
