import SwiftUI

struct FoodSearchResultsContent: View {
    let isSearching: Bool
    let searchText: String
    let commonResults: [CatalogFood]
    let brandedResults: [CatalogFood]
    let recentFoods: [CatalogFood]
    let onSelect: (CatalogFood) -> Void

    private var hasMinimumQueryLength: Bool {
        searchText.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2
    }

    var body: some View {
        if !hasMinimumQueryLength, !recentFoods.isEmpty {
            FoodSearchSection(title: "Recently Added", foods: recentFoods, onSelect: onSelect)
        } else if isSearching {
            HStack {
                Spacer()
                ProgressView("Searching")
                Spacer()
            }
            .listRowSeparator(.hidden)
        } else if commonResults.isEmpty, brandedResults.isEmpty {
            ContentUnavailableView(
                hasMinimumQueryLength ? "No valid foods found" : "Find a food",
                systemImage: "fork.knife",
                description: Text(
                    hasMinimumQueryLength
                        ? "Try a different food or brand name."
                        : "Search common and branded foods, or scan a barcode."
                )
            )
            .listRowSeparator(.hidden)
            .listRowBackground(Color.clear)
        } else {
            if !commonResults.isEmpty {
                FoodSearchSection(title: "Common", foods: commonResults, onSelect: onSelect)
            }
            if !brandedResults.isEmpty {
                FoodSearchSection(title: "Branded", foods: brandedResults, onSelect: onSelect)
            }
        }
    }
}
