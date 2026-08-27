import Testing
@testable import mons

struct FoodSearchResultPresentationTests {
    @Test func scalesNutritionToTheDefaultGramPortion() {
        let presentation = FoodSearchResultPresentation(
            food: food(
                brand: "Happy Egg Co.",
                portions: [FoodPortion(amount: 50, name: "1 large egg", unit: .grams)]
            )
        )

        #expect(presentation.nutritionSummary == "98 cal · 7 P · 8 F · 1 C")
        #expect(presentation.sourceAndServingSummary == "Happy Egg Co. · 1 large egg · 50 g")
        #expect(presentation.sourceIcon == "shippingbox")
    }

    @Test func fallsBackToPerHundredGramsForCommonFoods() {
        let presentation = FoodSearchResultPresentation(food: food(brand: nil, portions: []))

        #expect(presentation.nutritionSummary == "196 cal · 14 P · 15 F · 1 C")
        #expect(presentation.sourceAndServingSummary == "Common food · Per 100 g")
        #expect(presentation.sourceIcon == "fork.knife")
    }

    @Test func identifiesCustomFoodsAndRecipes() {
        let custom = FoodSearchResultPresentation(
            food: food(brand: nil, datasetKind: .custom, portions: [])
        )
        let recipe = FoodSearchResultPresentation(
            food: food(brand: nil, datasetKind: .recipe, portions: [])
        )

        #expect(custom.sourceAndServingSummary == "My Food · Per 100 g")
        #expect(custom.sourceIcon == "square.and.pencil")
        #expect(recipe.sourceAndServingSummary == "Recipe · Per 100 g")
        #expect(recipe.sourceIcon == "book.closed")
    }

    private func food(
        brand: String?,
        datasetKind: DatasetKind? = nil,
        portions: [FoodPortion]
    ) -> CatalogFood {
        CatalogFood(
            brand: brand,
            calories: 196,
            carbohydrates: 1,
            datasetKind: datasetKind ?? (brand == nil ? .raw : .branded),
            foodId: "food",
            gtin: nil,
            name: "Eggs, Grade A, Large",
            nutrients: [],
            portions: portions,
            protein: 14,
            source: "fixture",
            sourceId: "fixture",
            totalFat: 15
        )
    }
}
