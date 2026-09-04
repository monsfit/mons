#if DEBUG && os(iOS)
import SwiftUI

struct MealComposerFoodSearchResults: View {
    let scope: FoodSearchScope
    let query: String
    let foods: [CatalogFood]
    let onSelect: (CatalogFood) -> Void
    let onQuickAdd: (CatalogFood) -> Void

    private var filteredFoods: [CatalogFood] {
        let normalizedQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)
        let scopedFoods = foods.filter(matchesScope)
        guard !normalizedQuery.isEmpty else { return scopedFoods }
        return scopedFoods.filter { food in
            food.name.localizedStandardContains(normalizedQuery)
                || food.brand?.localizedStandardContains(normalizedQuery) == true
        }
    }

    private var commonFoods: [CatalogFood] {
        filteredFoods.filter { $0.datasetKind == .raw }
    }

    private var brandedFoods: [CatalogFood] {
        filteredFoods.filter { $0.datasetKind == .branded }
    }

    private var customFoods: [CatalogFood] {
        filteredFoods.filter { $0.datasetKind == .custom }
    }

    private var recipes: [CatalogFood] {
        filteredFoods.filter { $0.datasetKind == .recipe }
    }

    private var restaurantFoods: [CatalogFood] {
        filteredFoods.filter { $0.datasetKind == .restaurant }
    }

    var body: some View {
        Group {
            if filteredFoods.isEmpty {
                if query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    ContentUnavailableView(
                        scope.emptyTitle,
                        systemImage: scope.systemImage,
                        description: Text(scope.emptyDescription)
                    )
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
                } else {
                    ContentUnavailableView.search
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                }
            } else {
                if !commonFoods.isEmpty {
                    MealComposerFoodSearchSection(
                        title: "Common",
                        subtitle: "Reference foods and ingredients",
                        foods: commonFoods,
                        query: query,
                        onSelect: onSelect,
                        onQuickAdd: onQuickAdd
                    )
                }

                if !brandedFoods.isEmpty {
                    MealComposerFoodSearchSection(
                        title: "Branded",
                        subtitle: "Packaged foods and restaurant items",
                        foods: brandedFoods,
                        query: query,
                        onSelect: onSelect,
                        onQuickAdd: onQuickAdd
                    )
                }

                if !restaurantFoods.isEmpty {
                    MealComposerFoodSearchSection(
                        title: "Restaurants",
                        subtitle: "Menu items from restaurants",
                        foods: restaurantFoods,
                        query: query,
                        onSelect: onSelect,
                        onQuickAdd: onQuickAdd
                    )
                }

                if !customFoods.isEmpty {
                    MealComposerFoodSearchSection(
                        title: "My Foods",
                        subtitle: "Foods entered by you",
                        foods: customFoods,
                        query: query,
                        onSelect: onSelect,
                        onQuickAdd: onQuickAdd
                    )
                }

                if !recipes.isEmpty {
                    MealComposerFoodSearchSection(
                        title: "My Recipes",
                        subtitle: "Recipes and saved meal combinations",
                        foods: recipes,
                        query: query,
                        onSelect: onSelect,
                        onQuickAdd: onQuickAdd
                    )
                }
            }
        }
    }

    private func matchesScope(_ food: CatalogFood) -> Bool {
        switch scope {
        case .all:
            true
        case .foods:
            food.datasetKind == .custom
        case .recipes:
            food.datasetKind == .recipe
        case .meals:
            false
        }
    }
}
#endif
