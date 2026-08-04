import SwiftUI

struct FoodSearchSection: View {
    let title: String
    let foods: [CatalogFood]
    let onSelect: (CatalogFood) -> Void

    var body: some View {
        Section(title) {
            ForEach(foods) { food in
                Button {
                    onSelect(food)
                } label: {
                    FoodSearchResultRow(food: food)
                }
                .buttonStyle(.plain)
                .listRowBackground(MonsColor.surface)
                .listRowSeparatorTint(MonsColor.border)
            }
        }
    }
}

