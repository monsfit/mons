import Foundation
import Testing
@testable import mons

struct MealLogModelsTests {
    @Test func groupedDraftAggregatesNutritionAndEncodesPhotoOnlyOnCreate() throws {
        let item = PendingFoodLogItem(
            entryId: try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000071")),
            food: CatalogFood(
                brand: nil,
                calories: 200,
                carbohydrates: 20,
                datasetKind: .raw,
                foodId: "42",
                gtin: nil,
                name: "Test Food",
                nutrients: [],
                portions: [],
                protein: 10,
                source: "test",
                sourceId: "42",
                totalFat: 5
            ),
            loggedAt: Date(timeIntervalSince1970: 1_775_304_000),
            quantityGrams: 150
        )
        var draft = MealReviewDraft(items: [item], description: "Test meal")
        draft.photoData = Data([1, 2, 3])

        #expect(draft.calories == 300)
        #expect(draft.protein == 15)
        #expect(draft.totalFat == 7.5)
        #expect(draft.carbohydrates == 30)

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let create = try #require(
            JSONSerialization.jsonObject(with: encoder.encode(SaveMealLogRequest(draft: draft)))
                as? [String: Any]
        )
        let update = try #require(
            JSONSerialization.jsonObject(
                with: encoder.encode(SaveMealLogRequest(draft: draft, includePhoto: false))
            ) as? [String: Any]
        )

        #expect(create["photoDataBase64"] as? String == "AQID")
        #expect(update["photoDataBase64"] == nil)
    }
}
