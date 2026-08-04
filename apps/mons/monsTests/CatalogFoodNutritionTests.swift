import Testing
@testable import mons

struct CatalogFoodNutritionTests {
    @Test func scalesPerHundredGramNutritionDeterministically() {
        let food = CatalogFood(
            brand: "Example",
            calories: 90,
            carbohydrates: 0.4,
            datasetKind: .branded,
            foodId: "1",
            gtin: "00000000000001",
            name: "Egg Fried",
            protein: 6.3,
            source: "fixture",
            sourceId: "food-1",
            totalFat: 6.8
        )

        #expect(food.scaled(food.calories, quantityGrams: 150) == 135)
        #expect(food.scaled(food.protein, quantityGrams: 200) == 12.6)
        #expect(food.scaled(nil, quantityGrams: 100) == 0)
        #expect(food.scaled(food.calories, quantityGrams: -20) == 0)
    }
}
