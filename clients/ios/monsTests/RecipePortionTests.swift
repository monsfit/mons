import Foundation
import Testing
@testable import mons

struct RecipePortionTests {
    @Test func measuredYieldCreatesDeterministicServingAndWeightPortions() throws {
        let recipeId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000100"))
        let recipe = Recipe(
            calories: 80,
            carbohydrates: 10,
            freeformIngredients: [],
            imageDataBase64: nil,
            ingredients: [],
            name: "Test Recipe",
            notes: "",
            nutritionStatus: .calculated,
            protein: 6,
            recipeId: recipeId,
            servings: 4,
            sourceKind: .recipe,
            totalFat: 2.8,
            totalYieldGrams: 500
        )

        #expect(recipe.catalogFood.gramPortions.map(\.amount) == [125, 500])
        #expect(
            recipe.catalogFood.quantityGrams(
                amount: 1.5,
                portion: recipe.catalogFood.gramPortions.first
            ) == 187.5
        )
    }
}
