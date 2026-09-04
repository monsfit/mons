import SwiftUI

struct RecipeIngredientEditorRow: View {
    @Binding var ingredient: RecipeIngredientDraft

    let onRemove: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: MonsSpacing.small) {
            HStack(alignment: .center, spacing: MonsSpacing.medium) {
                Image(systemName: sourceSystemImage)
                    .foregroundStyle(MonsColor.textSecondary)
                    .frame(width: 24)
                    .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                    Text(ingredient.food.name)
                        .font(MonsTypography.headline)
                        .foregroundStyle(MonsColor.textPrimary)
                        .lineLimit(2)

                    Text(sourceDescription)
                        .font(MonsTypography.caption)
                        .foregroundStyle(MonsColor.textSecondary)
                        .lineLimit(1)
                }

                Spacer(minLength: MonsSpacing.small)

                Button("Remove ingredient", systemImage: "trash", role: .destructive, action: onRemove)
                    .labelStyle(.iconOnly)
                    .foregroundStyle(MonsColor.error)
                    .frame(width: 44, height: 44)
                    .buttonStyle(.plain)
            }

            LabeledContent("Amount") {
                HStack(spacing: MonsSpacing.small) {
                    TextField(
                        "Amount",
                        value: $ingredient.quantityGrams,
                        format: .number.precision(.fractionLength(0...2))
                    )
                    .multilineTextAlignment(.trailing)
                    #if os(iOS)
                    .keyboardType(.decimalPad)
                    #endif

                    Text("g")
                        .foregroundStyle(MonsColor.textSecondary)
                }
                .frame(maxWidth: 140, minHeight: 44)
            }
            .foregroundStyle(MonsColor.textSecondary)
        }
    }

    private var sourceDescription: String {
        guard let brand = ingredient.food.brand?.trimmingCharacters(in: .whitespacesAndNewlines),
              !brand.isEmpty else {
            return ingredient.food.datasetKind.title
        }
        return "\(brand) · \(ingredient.food.datasetKind.title)"
    }

    private var sourceSystemImage: String {
        switch ingredient.food.datasetKind {
        case .raw:
            "fork.knife"
        case .branded:
            "shippingbox.fill"
        case .custom:
            "person.crop.square.fill"
        case .recipe:
            "book.closed.fill"
        case .restaurant:
            "takeoutbag.and.cup.and.straw.fill"
        }
    }
}

#Preview("Recipe ingredient editor row") {
    RecipeIngredientEditorRow(
        ingredient: .constant(
            RecipeIngredientDraft(
                id: UUID(),
                food: CatalogFood(
                    brand: nil,
                    calories: 41,
                    carbohydrates: 10,
                    datasetKind: .raw,
                    foodId: "preview-carrot",
                    gtin: nil,
                    name: "Carrot, raw",
                    nutrients: [],
                    portions: [],
                    protein: 0.9,
                    source: "preview",
                    sourceId: "preview-carrot",
                    totalFat: 0.2
                ),
                quantityGrams: 100
            )
        ),
        onRemove: {}
    )
    .padding()
    .background(MonsColor.background)
}
