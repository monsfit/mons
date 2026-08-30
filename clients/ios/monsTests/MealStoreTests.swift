import Foundation
import Testing
@testable import mons

struct MealStoreTests {
    @Test func serializesOverlappingReschedulesForTheSameMeal() async throws {
        let api = MealStoreAPISpy()
        let store = MealStore(
            api: api,
            profileId: UUID(),
            calendar: .current,
            networkEnabled: true
        )
        store.configurePreview()
        let mealId = try #require(store.mealLogs.first?.mealId)
        let firstDate = Date(timeIntervalSince1970: 1_775_311_200)
        let secondDate = firstDate.addingTimeInterval(3_600)

        let first = Task { await store.reschedule(mealId, to: firstDate) }
        await api.waitForRequestCount(1)
        let second = Task { await store.reschedule(mealId, to: secondDate) }
        await Task.yield()
        await Task.yield()

        #expect(await api.requestCount == 1)
        await api.releaseFirstRequest()
        #expect(await first.value)
        #expect(await second.value)
        #expect(await api.requestDates == [firstDate, secondDate])
        #expect(store.mealLogs.first { $0.mealId == mealId }?.loggedAt == secondDate)
    }
}

private actor MealStoreAPISpy: MealStoreAPI {
    private var firstRequestContinuation: CheckedContinuation<Void, Never>?
    private var requests: [SaveMealLogRequest] = []

    var requestCount: Int { requests.count }
    var requestDates: [Date] { requests.map(\.loggedAt) }

    func waitForRequestCount(_ count: Int) async {
        while requests.count < count { await Task.yield() }
    }

    func releaseFirstRequest() {
        firstRequestContinuation?.resume()
        firstRequestContinuation = nil
    }

    func saveMealLog(
        profileId _: UUID,
        request: SaveMealLogRequest,
        updating _: Bool
    ) async throws -> MealLog {
        requests.append(request)
        if requests.count == 1 {
            await withCheckedContinuation { firstRequestContinuation = $0 }
        }
        return MealLog(
            calories: 0,
            carbohydrates: 0,
            description: request.description,
            estimateId: request.estimateId,
            inputKind: nil,
            items: [],
            loggedAt: request.loggedAt,
            mealCategory: request.mealCategory,
            mealId: request.mealId,
            photoAvailable: false,
            protein: 0,
            totalFat: 0
        )
    }

    func searchFoods(query _: String, kind _: DatasetKind?, limit _: Int) async throws -> [CatalogFood] { [] }
    func food(datasetKind _: DatasetKind, foodId _: String) async throws -> CatalogFood { throw StubError.unimplemented }
    func food(gtin _: String) async throws -> CatalogFood { throw StubError.unimplemented }
    func logFood(profileId _: UUID, entry _: CreateFoodLogEntryRequest) async throws -> FoodLogEntry { throw StubError.unimplemented }
    func deleteFoodLogEntry(profileId _: UUID, entryId _: UUID) async throws {}
    func customFoods(profileId _: UUID) async throws -> [CustomFood] { [] }
    func saveCustomFood(profileId _: UUID, food _: SaveCustomFoodRequest) async throws -> CustomFood { throw StubError.unimplemented }
    func deleteCustomFood(profileId _: UUID, foodId _: UUID) async throws {}
    func recipes(profileId _: UUID) async throws -> [Recipe] { [] }
    func saveRecipe(profileId _: UUID, recipe _: SaveRecipeRequest) async throws -> Recipe { throw StubError.unimplemented }
    func deleteRecipe(profileId _: UUID, recipeId _: UUID) async throws {}
    func createMealEstimate(profileId _: UUID, request _: CreateMealEstimateRequest) async throws -> MealEstimate { throw StubError.unimplemented }
    func mealLogs(profileId _: UUID, from _: Date, to _: Date) async throws -> [MealLog] { [] }
    func deleteMealLog(profileId _: UUID, mealId _: UUID) async throws {}
    func mealPhoto(profileId _: UUID, mealId _: UUID) async throws -> Data? { nil }
    func describeMeal(profileId _: UUID, request _: MealDescriptionRequest) async throws -> String { "" }
    func discardMealEstimate(profileId _: UUID, estimateId _: UUID) async throws {}
}

private enum StubError: Error {
    case unimplemented
}
