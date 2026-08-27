import Foundation
import Testing
@testable import mons

struct RecipeIngredientParserTests {
    @Test func parsesQuantitiesAndCanonicalUnitsDeterministically() throws {
        let garlic = try #require(RecipeIngredientParser.parse("2 tbsp garlic"))
        let flour = try #require(RecipeIngredientParser.parse("1 1/2 cups flour"))
        let salt = try #require(RecipeIngredientParser.parse("½ tsp salt"))

        #expect(garlic.quantity == 2)
        #expect(garlic.unit == .tablespoon)
        #expect(garlic.name == "garlic")
        #expect(flour.quantity == 1.5)
        #expect(flour.unit == .cup)
        #expect(flour.name == "flour")
        #expect(salt.quantity == 0.5)
        #expect(salt.unit == .teaspoon)
    }

    @Test func treatsUnitlessCountsAsPiecesAndPreservesUnparsedText() throws {
        let eggs = try #require(RecipeIngredientParser.parse("3 eggs"))
        let seasoning = try #require(RecipeIngredientParser.parse("salt to taste"))

        #expect(eggs.quantity == 3)
        #expect(eggs.unit == .piece)
        #expect(eggs.scaledDescription(multiplier: 2) == "6 eggs")
        #expect(seasoning.quantity == nil)
        #expect(seasoning.unit == nil)
        #expect(seasoning.scaledDescription(multiplier: 4) == "salt to taste")
    }

    @Test func scalesWrittenIngredientsForSelectedRecipeAmounts() throws {
        let garlic = try #require(RecipeIngredientParser.parse("2 tbsp garlic"))

        #expect(garlic.scaledDescription(multiplier: 0.5) == "1 tbsp garlic")
        #expect(garlic.scaledDescription(multiplier: 3) == "6 tbsp garlic")
    }
}
