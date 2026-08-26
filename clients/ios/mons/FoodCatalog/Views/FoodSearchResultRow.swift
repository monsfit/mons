import SwiftUI

struct FoodSearchResultRow: View {
    let food: CatalogFood
    let searchText: String
    let showsDisclosureIndicator: Bool

    init(food: CatalogFood, searchText: String, showsDisclosureIndicator: Bool = true) {
        self.food = food
        self.searchText = searchText
        self.showsDisclosureIndicator = showsDisclosureIndicator
    }

    var body: some View {
        let presentation = FoodSearchResultPresentation(food: food)

        HStack(alignment: .center, spacing: MonsSpacing.medium) {
            VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                highlightedName
                    .font(MonsTypography.headline)
                    .foregroundStyle(MonsColor.textPrimary)
                    .lineLimit(2)

                Text(presentation.nutritionSummary)
                    .font(MonsTypography.subheadline)
                    .foregroundStyle(MonsColor.textSecondary)
                    .lineLimit(1)

                Label(presentation.sourceAndServingSummary, systemImage: presentation.sourceIcon)
                    .font(MonsTypography.caption)
                    .foregroundStyle(MonsColor.textMuted)
                    .lineLimit(1)
            }

            Spacer(minLength: MonsSpacing.small)

            if showsDisclosureIndicator {
                Image(systemName: "chevron.forward")
                    .font(.caption.bold())
                    .foregroundStyle(.tertiary)
                    .accessibilityHidden(true)
            }
        }
        .padding(.vertical, MonsSpacing.xSmall)
        .accessibilityElement(children: .combine)
        .accessibilityHint("Opens serving details")
    }

    private var highlightedName: Text {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        var attributedName = AttributedString(food.name)

        if !query.isEmpty,
           let range = attributedName.range(of: query, options: [.caseInsensitive, .diacriticInsensitive]) {
            attributedName[range].inlinePresentationIntent = .stronglyEmphasized
        }

        return Text(attributedName)
    }
}

#Preview("Search result") {
    FoodSearchResultRow(
        food: CatalogFood(
            brand: "Happy Egg Co.",
            calories: 196,
            carbohydrates: 1,
            datasetKind: .branded,
            foodId: "preview-egg",
            gtin: nil,
            name: "Eggs, Grade A, Large",
            nutrients: [],
            portions: [FoodPortion(amount: 82, name: "2 large eggs", unit: .grams)],
            protein: 14,
            source: "usda_branded",
            sourceId: "preview",
            totalFat: 15
        ),
        searchText: "egg"
    )
    .padding()
    .background(MonsColor.background)
}
