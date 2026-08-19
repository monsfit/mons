import SwiftUI

struct FoodSearchResultsContent: View {
    let scope: FoodSearchScope
    let isSearching: Bool
    let searchText: String
    let commonResults: [CatalogFood]
    let brandedResults: [CatalogFood]
    let recentFoods: [CatalogFood]
    let customFoods: [CatalogFood]
    let recipes: [CatalogFood]
    let onSelect: (CatalogFood) -> Void
    let onEdit: (CatalogFood) -> Void
    let onDelete: (CatalogFood) -> Void

    private var hasMinimumQueryLength: Bool {
        searchText.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2
    }

    var body: some View {
        Group {
            if scope == .foods, !customFoods.isEmpty {
                FoodSearchSection(
                    title: "My Foods",
                    subtitle: "Foods entered by you",
                    foods: filtered(customFoods),
                    searchText: searchText,
                    onSelect: onSelect,
                    onEdit: onEdit,
                    onDelete: onDelete
                )
            } else if scope == .recipes, !recipes.isEmpty {
                FoodSearchSection(
                    title: "My Recipes",
                    subtitle: "Measured-yield and written recipes",
                    foods: filtered(recipes),
                    searchText: searchText,
                    onSelect: onSelect,
                    onEdit: onEdit,
                    onDelete: onDelete
                )
            } else if scope != .all {
                FoodSearchStatusView(
                    title: scope.emptyTitle,
                    description: scope.emptyDescription,
                    systemImage: scope.systemImage,
                    showsProgress: false
                )
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
            } else if !hasMinimumQueryLength, !recentFoods.isEmpty {
                FoodSearchSection(
                    title: "Recent",
                    subtitle: "Foods you logged most recently",
                    foods: recentFoods,
                    searchText: "",
                    onSelect: onSelect
                )
            } else if isSearching {
                FoodSearchStatusView(
                    title: "Searching",
                    description: "Finding common and branded foods.",
                    systemImage: "magnifyingglass",
                    showsProgress: true
                )
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
            } else if commonResults.isEmpty, brandedResults.isEmpty {
                FoodSearchStatusView(
                    title: hasMinimumQueryLength ? "No valid foods found" : "Find a food",
                    description: hasMinimumQueryLength
                        ? "Try a different food or brand name."
                        : "Search common and branded foods, or scan a barcode.",
                    systemImage: hasMinimumQueryLength ? "magnifyingglass" : "fork.knife",
                    showsProgress: false
                )
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
            } else {
                if !commonResults.isEmpty {
                    FoodSearchSection(
                        title: "Common foods",
                        subtitle: "Reference foods and ingredients",
                        foods: commonResults,
                        searchText: searchText,
                        onSelect: onSelect
                    )
                }
                if !brandedResults.isEmpty {
                    FoodSearchSection(
                        title: "Branded foods",
                        subtitle: "Packaged foods and restaurant items",
                        foods: brandedResults,
                        searchText: searchText,
                        onSelect: onSelect
                    )
                }
            }
        }
    }

    private func filtered(_ foods: [CatalogFood]) -> [CatalogFood] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return foods }
        return foods.filter { $0.name.localizedStandardContains(query) }
    }
}
