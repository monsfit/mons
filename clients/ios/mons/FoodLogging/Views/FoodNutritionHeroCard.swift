import SwiftUI

struct FoodNutritionHeroCard: View {
    let food: CatalogFood
    let quantityGrams: Double

    var body: some View {
        MonsCard(isRaised: true) {
            VStack(alignment: .leading, spacing: MonsSpacing.large) {
                HStack(alignment: .firstTextBaseline) {
                    Text("Nutrition")
                        .font(MonsTypography.sectionTitle)

                    Spacer()

                    Label(quantityText, systemImage: "scalemass")
                        .font(MonsTypography.caption)
                        .foregroundStyle(MonsColor.textSecondary)
                }

                Divider()

                NutritionSummary(food: food, quantityGrams: quantityGrams)
            }
        }
    }

    private var quantityText: String {
        let grams = quantityGrams.formatted(.number.precision(.fractionLength(0...1)))
        return "\(grams) g"
    }
}
