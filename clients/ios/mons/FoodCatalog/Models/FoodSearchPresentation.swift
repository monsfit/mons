import Foundation

enum FoodSearchPresentation: Identifiable {
    case libraryEditor(LibraryEditor)
    case mealDraft(MealReviewDraft)
    case mealEstimate(MealEstimate)
    case mealInput(MealInput)

    enum LibraryEditor {
        case editCustomFood(CustomFood)
        case editRecipe(Recipe)
        case newCustomFood(barcode: String?)
        case newRecipe
    }

    enum MealInput: String {
        case text
        case voice
    }

    var id: String {
        switch self {
        case .libraryEditor(let destination):
            switch destination {
            case .editCustomFood(let food): "custom-\(food.id)"
            case .editRecipe(let recipe): "recipe-\(recipe.id)"
            case .newCustomFood(let barcode): "new-custom-\(barcode ?? "none")"
            case .newRecipe: "new-recipe"
            }
        case .mealDraft: "meal-draft"
        case .mealEstimate(let estimate): "meal-estimate-\(estimate.id)"
        case .mealInput(let input): "meal-input-\(input.rawValue)"
        }
    }
}

enum FoodSearchFullScreenDestination: String, Identifiable {
    static let transitionSourceID = "food-camera-menu"

    case barcode
    case mealPhoto

    var id: Self { self }
}
