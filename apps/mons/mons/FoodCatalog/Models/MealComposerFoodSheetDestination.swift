#if DEBUG && os(iOS)
import Foundation

enum MealComposerFoodSheetDestination: Identifiable {
    case edit(MealComposerDraftItem)
    case food(CatalogFood)
    case newCustomFood(String)
    case search

    var id: String {
        switch self {
        case .edit(let item):
            "edit-\(item.id)"
        case .food(let food):
            "food-\(food.id)"
        case .newCustomFood(let gtin):
            "new-custom-\(gtin)"
        case .search:
            "search"
        }
    }
}
#endif
