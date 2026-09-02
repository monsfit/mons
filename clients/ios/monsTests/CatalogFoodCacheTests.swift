import Foundation
import Testing
@testable import mons

struct CatalogFoodCacheTests {
    @Test func persistsFoodsAndInvalidatesThemWhenTheReleaseChanges() async throws {
        let directory = FileManager.default.temporaryDirectory
            .appending(path: UUID().uuidString, directoryHint: .isDirectory)
        let fileURL = directory.appending(path: "catalog-cache.json", directoryHint: .notDirectory)
        defer { try? FileManager.default.removeItem(at: directory) }
        let cachedAt = Date(timeIntervalSince1970: 1_800_000_000)
        let food = fixtureFood

        let first = CatalogFoodCache(fileURL: fileURL, now: { cachedAt })
        await first.insert(food, releaseId: "release-one")
        #expect(await first.food(datasetKind: .branded, foodId: "42") == food)
        #expect(await first.food(gtin: "00012345678905") == food)

        let restored = CatalogFoodCache(fileURL: fileURL, now: { cachedAt })
        #expect(await restored.food(datasetKind: .branded, foodId: "42") == food)
        await restored.activate(releaseId: "release-two")
        #expect(await restored.food(datasetKind: .branded, foodId: "42") == nil)
    }

    @Test func expiresOldEntries() async {
        let directory = FileManager.default.temporaryDirectory
            .appending(path: UUID().uuidString, directoryHint: .isDirectory)
        let fileURL = directory.appending(path: "catalog-cache.json", directoryHint: .notDirectory)
        defer { try? FileManager.default.removeItem(at: directory) }
        let cachedAt = Date(timeIntervalSince1970: 1_800_000_000)

        let writer = CatalogFoodCache(fileURL: fileURL, maximumAge: 60, now: { cachedAt })
        await writer.insert(fixtureFood, releaseId: "release-one")

        let later = cachedAt.addingTimeInterval(61)
        let reader = CatalogFoodCache(fileURL: fileURL, maximumAge: 60, now: { later })
        #expect(await reader.food(datasetKind: .branded, foodId: "42") == nil)
    }

    private var fixtureFood: CatalogFood {
        CatalogFood(
            brand: "Example",
            calories: 100,
            carbohydrates: 10,
            datasetKind: .branded,
            foodId: "42",
            gtin: "00012345678905",
            name: "Example Food",
            nutrients: [],
            portions: [FoodPortion(amount: 30, name: "1 serving", unit: .grams)],
            protein: 5,
            source: "fixture",
            sourceId: "fixture-42",
            totalFat: 4
        )
    }
}
