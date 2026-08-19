import Foundation
import Testing
@testable import mons

struct PendingFoodLogItemTests {
    @Test func preservesAnExplicitMealCategoryWhenEditing() {
        let date = Date(timeIntervalSince1970: 0)
        let item = PendingFoodLogItem(
            entryId: UUID(uuidString: "00000000-0000-4000-8000-000000000001") ?? UUID(),
            food: food,
            loggedAt: date,
            mealCategory: .dinner,
            quantityGrams: 125
        )

        #expect(item.mealCategory == .dinner)
        #expect(item.quantityGrams == 125)
    }

    @Test func infersMealCategoryForNewEntries() {
        let date = Date(timeIntervalSince1970: 1_775_296_800)
        let item = PendingFoodLogItem(
            entryId: UUID(uuidString: "00000000-0000-4000-8000-000000000002") ?? UUID(),
            food: food,
            loggedAt: date,
            quantityGrams: 100
        )

        #expect(item.mealCategory == MealCategory.inferred(from: date))
    }

    private var food: CatalogFood {
        CatalogFood(
            brand: nil,
            calories: 100,
            carbohydrates: 20,
            datasetKind: .raw,
            foodId: "1",
            gtin: nil,
            name: "Test Food",
            nutrients: [],
            portions: [],
            protein: 5,
            source: "test",
            sourceId: "1",
            totalFat: 2
        )
    }
}
