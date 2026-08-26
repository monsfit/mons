import Foundation
import Testing
@testable import mons

struct RecipeRequestEncodingTests {
    @Test func photoAndOtherNullableRecipeFieldsEncodeAsJSONNull() throws {
        let recipeId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000201"))
        let databaseIngredientId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000202"))
        let writtenIngredientId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000203"))
        let request = SaveRecipeRequest(
            freeformIngredients: [
                FreeformRecipeIngredient(
                    calories: nil,
                    carbohydrates: nil,
                    ingredientId: writtenIngredientId,
                    name: nil,
                    protein: nil,
                    quantity: nil,
                    text: "salt to taste",
                    totalFat: nil,
                    unit: nil
                ),
            ],
            imageDataBase64: nil,
            ingredients: [
                RecipeIngredient(
                    calories: nil,
                    carbohydrates: nil,
                    foodId: "raw-preview",
                    ingredientId: databaseIngredientId,
                    name: "Ingredient",
                    protein: nil,
                    quantityGrams: 100,
                    sourceKind: .raw,
                    totalFat: nil
                ),
            ],
            name: "No-photo recipe",
            notes: "",
            recipeId: recipeId,
            servings: nil,
            totalYieldGrams: 500
        )

        let data = try JSONEncoder().encode(request)
        let payload = try #require(JSONSerialization.jsonObject(with: data) as? [String: Any])
        let databaseIngredients = try #require(payload["ingredients"] as? [[String: Any]])
        let writtenIngredients = try #require(payload["freeformIngredients"] as? [[String: Any]])

        #expect(payload["imageDataBase64"] is NSNull)
        #expect(payload["servings"] is NSNull)
        #expect(databaseIngredients[0]["calories"] is NSNull)
        #expect(databaseIngredients[0]["protein"] is NSNull)
        #expect(writtenIngredients[0]["name"] is NSNull)
        #expect(writtenIngredients[0]["quantity"] is NSNull)
        #expect(writtenIngredients[0]["unit"] is NSNull)
    }
}
