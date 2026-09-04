import Foundation
import Testing
@testable import mons

struct FoodSearchResultTests {
    @Test func decodesMinimalResultAndBuildsDisplayFood() throws {
        let data = Data(
            """
            {
              "brand": "Example",
              "calories": 120,
              "carbohydrates": 18,
              "datasetKind": "branded",
              "defaultPortion": { "amount": 30, "name": "1 bar", "unit": "g" },
              "foodId": "42",
              "name": "Example Food",
              "nutrientBasis": { "amount": 100, "unit": "g" },
              "protein": 5,
              "totalFat": 2
            }
            """.utf8
        )

        let result = try JSONDecoder().decode(FoodSearchResult.self, from: data)
        let food = result.catalogFood

        #expect(food.name == "Example Food")
        #expect(food.calories == 120)
        #expect(food.carbohydrates == 18)
        #expect(food.protein == 5)
        #expect(food.totalFat == 2)
        #expect(food.nutrients.isEmpty)
        #expect(food.nutrientBasis == .standardHundredGrams)
        #expect(food.portions == [FoodPortion(amount: 30, name: "1 bar", unit: .grams)])
    }
}
