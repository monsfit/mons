#if DEBUG && os(iOS)
import SwiftUI

struct MealComposerFoodSearchBrowseContent: View {
    @Environment(\.accessibilityReduceMotion) private var accessibilityReduceMotion

    @Binding var query: String
    let foods: [CatalogFood]
    let searchFocus: FocusState<Bool>.Binding
    let mealItemCount: Int
    let mealCalories: Int
    let onSelect: (CatalogFood) -> Void
    let onQuickAdd: (CatalogFood) -> Void
    let onLogMeal: () -> Void

    var body: some View {
        List {
            MealComposerFoodSearchResults(
                scope: .all,
                query: query,
                foods: foods,
                onSelect: onSelect,
                onQuickAdd: onQuickAdd
            )
        }
        .listStyle(.insetGrouped)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if mealItemCount > 0 {
                MealComposerFoodSearchMealTotal(
                    itemCount: mealItemCount,
                    calories: mealCalories,
                    onLogMeal: onLogMeal
                )
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(
            accessibilityReduceMotion ? nil : .smooth(duration: 0.28, extraBounce: 0),
            value: mealItemCount
        )
        .scrollDismissesKeyboard(.interactively)
        .searchable(text: $query, prompt: "Search foods")
        .searchPresentationToolbarBehavior(.avoidHidingContent)
        .searchFocused(searchFocus)
        .textInputAutocapitalization(.never)
        .autocorrectionDisabled()
    }
}
#endif
