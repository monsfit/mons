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
            nutrients: [
                FoodNutrient(amount: 90, field: "calories", name: "Food energy", unit: "kcal"),
                FoodNutrient(amount: 6.3, field: "protein", name: "Protein", unit: "g"),
                FoodNutrient(amount: 95.2, field: "sodium", name: "Sodium", unit: "mg"),
            ],
            portions: [
                FoodPortion(amount: 50, name: "1 large egg", unit: .grams),
                FoodPortion(amount: 45, name: "3 tbsp", unit: .milliliters)
            ],
            protein: 6.3,
            source: "fixture",
            sourceId: "food-1",
            totalFat: 6.8
        )

        #expect(food.scaled(food.calories, quantityGrams: 150) == 135)
        #expect(food.scaled(food.protein, quantityGrams: 200) == 12.6)
        #expect(food.scaled(nil, quantityGrams: 100) == 0)
        #expect(food.scaled(food.calories, quantityGrams: -20) == 0)
        #expect(food.gramPortions.map(\.name) == ["1 large egg"])
        #expect(food.quantityGrams(amount: 2, portion: food.gramPortions.first) == 100)
        #expect(food.quantityGrams(amount: 75, portion: nil) == 75)
        #expect(food.nutrients.map(\.group) == [.other, .protein, .minerals])
    }
}
