import Foundation
import Testing
@testable import mons

struct RecentFoodBuilderTests {
    @Test func returnsUniqueFoodsInReverseChronologicalOrder() {
        let earlier = entry(
            id: "00000000-0000-4000-8000-000000000001",
            foodId: "1",
            name: "Apple",
            loggedAt: Date(timeIntervalSince1970: 100)
        )
        let latest = entry(
            id: "00000000-0000-4000-8000-000000000002",
            foodId: "2",
            name: "Banana",
            loggedAt: Date(timeIntervalSince1970: 200)
        )
        let duplicate = entry(
            id: "00000000-0000-4000-8000-000000000003",
            foodId: "1",
            name: "Apple",
            loggedAt: Date(timeIntervalSince1970: 300)
        )

        let foods = RecentFoodBuilder.foods(
            pendingItems: [],
            entries: [earlier, latest, duplicate]
        )

        #expect(foods.map(\.name) == ["Apple", "Banana"])
        #expect(foods[0].calories == 100)
    }

    private func entry(
        id: String,
        foodId: String,
        name: String,
        loggedAt: Date
    ) -> FoodLogEntry {
        FoodLogEntry(
            brand: nil,
            calories: 50,
            carbohydrates: 10,
            datasetKind: .raw,
            entryId: UUID(uuidString: id) ?? UUID(),
            fat: 1,
            foodId: foodId,
            gtin: nil,
            loggedAt: loggedAt,
            mealCategory: .snack,
            name: name,
            protein: 2,
            quantityGrams: 50
        )
    }
}
