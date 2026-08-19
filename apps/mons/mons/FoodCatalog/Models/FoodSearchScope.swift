import Foundation

enum FoodSearchScope: String, CaseIterable, Hashable, Identifiable, Sendable {
    case all
    case meals
    case recipes
    case foods

    var id: Self { self }

    var title: String {
        switch self {
        case .all:
            "All"
        case .meals:
            "My Meals"
        case .recipes:
            "My Recipes"
        case .foods:
            "My Foods"
        }
    }

    var emptyTitle: String {
        switch self {
        case .all:
            "Find a food"
        case .meals:
            "No saved meals yet"
        case .recipes:
            "No saved recipes yet"
        case .foods:
            "No custom foods yet"
        }
    }

    var emptyDescription: String {
        switch self {
        case .all:
            "Search common and branded foods, or scan a barcode."
        case .meals:
            "Meals you create will be available here."
        case .recipes:
            "Recipes you create will be available here."
        case .foods:
            "Foods you create will be available here."
        }
    }

    var systemImage: String {
        switch self {
        case .all:
            "fork.knife"
        case .meals:
            "takeoutbag.and.cup.and.straw"
        case .recipes:
            "book.closed"
        case .foods:
            "square.and.pencil"
        }
    }
}
