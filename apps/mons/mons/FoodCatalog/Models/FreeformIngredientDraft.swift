import Foundation

struct FreeformIngredientDraft: Identifiable {
    let id: UUID
    var text: String

    var parsedIngredient: FreeformRecipeIngredient? {
        RecipeIngredientParser.parse(text, ingredientId: id)
    }
}
