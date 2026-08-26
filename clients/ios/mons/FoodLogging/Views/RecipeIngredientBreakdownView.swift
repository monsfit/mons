import SwiftUI

struct RecipeIngredientBreakdownView: View {
    let quantityGrams: Double
    let recipe: Recipe

    private var multiplier: Double {
        guard recipe.totalYieldGrams > 0 else { return 0 }
        return quantityGrams / recipe.totalYieldGrams
    }

    var body: some View {
        VStack(alignment: .leading, spacing: MonsSpacing.medium) {
            Text("Recipe ingredients")
                .font(MonsTypography.sectionTitle)

            MonsCard {
                VStack(spacing: MonsSpacing.medium) {
                    ForEach(recipe.ingredients) { ingredient in
                        RecipeDatabaseIngredientRow(
                            name: ingredient.name,
                            amount: "\((ingredient.quantityGrams * multiplier).formatted(.number.precision(.fractionLength(0...1)))) g"
                        )
                    }

                    ForEach(recipe.freeformIngredients) { ingredient in
                        Text(ingredient.scaledDescription(multiplier: multiplier))
                    }
                }
            }

            Text("Scaled for the selected amount")
                .font(MonsTypography.caption)
                .foregroundStyle(MonsColor.textSecondary)
        }
    }
}
