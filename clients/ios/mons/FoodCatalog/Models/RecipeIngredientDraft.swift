import Foundation

struct RecipeIngredientDraft: Identifiable {
    let id: UUID
    let food: CatalogFood
    var quantityGrams: Double
}
