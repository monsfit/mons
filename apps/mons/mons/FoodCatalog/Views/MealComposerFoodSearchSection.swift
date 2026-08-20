#if DEBUG && os(iOS)
import SwiftUI

struct MealComposerFoodSearchSection: View {
    let title: String
    let subtitle: String
    let foods: [CatalogFood]
    let query: String
    let onSelect: (CatalogFood) -> Void
    let onQuickAdd: (CatalogFood) -> Void

    var body: some View {
        Section {
            ForEach(foods) { food in
                HStack(spacing: MonsSpacing.small) {
                    Button {
                        onSelect(food)
                    } label: {
                        FoodSearchResultRow(
                            food: food,
                            searchText: query,
                            showsDisclosureIndicator: false
                        )
                        .contentShape(.rect)
                    }
                    .buttonStyle(.plain)

                    Button("Add \(food.name) to meal", systemImage: "plus", action: {
                        onQuickAdd(food)
                    })
                    .labelStyle(.iconOnly)
                    .buttonStyle(.glass)
                    .buttonBorderShape(.circle)
                    .frame(width: 44, height: 44)
                }
            }
        } header: {
            HStack(alignment: .firstTextBaseline, spacing: MonsSpacing.medium) {
                Text(title)

                Spacer(minLength: MonsSpacing.small)

                Text(foods.count.formatted())
                    .accessibilityLabel("\(foods.count) foods")
            }
        } footer: {
            Text(subtitle)
        }
    }
}
#endif
