import Foundation
import Observation

@Observable
@MainActor
final class MealStore {
    private(set) var customFoods: [CustomFood] = []
    private(set) var foodLog: [FoodLogEntry] = []
    private(set) var isLoading = false
    private(set) var mealLogs: [MealLog] = []
    private(set) var recipes: [Recipe] = []

    @ObservationIgnored private let api: any MealStoreAPI
    @ObservationIgnored private let calendar: Calendar
    @ObservationIgnored private var mealPhotoCache: [UUID: Data] = [:]
    @ObservationIgnored private var rescheduleBaselines: [UUID: MealLog] = [:]
    @ObservationIgnored private var rescheduleTasks: [UUID: Task<Bool, Never>] = [:]
    @ObservationIgnored private var rescheduleVersions: [UUID: UUID] = [:]
    @ObservationIgnored private let networkEnabled: Bool
    @ObservationIgnored private var onEvent: (MealStoreEvent) -> Void = { _ in }

    private var profileId: UUID

    init(
        api: any MealStoreAPI,
        profileId: UUID,
        calendar: Calendar,
        networkEnabled: Bool
    ) {
        self.api = api
        self.profileId = profileId
        self.calendar = calendar
        self.networkEnabled = networkEnabled
    }

    func connect(profileId: UUID, onEvent: @escaping (MealStoreEvent) -> Void) {
        self.profileId = profileId
        self.onEvent = onEvent
    }

    func load(around date: Date) async {
        guard networkEnabled else { return }
        isLoading = true
        defer { isLoading = false }
        let day = calendar.startOfDay(for: date)
        let from = calendar.date(byAdding: .day, value: -7, to: day) ?? day
        let to = calendar.date(byAdding: .day, value: 8, to: day) ?? day
        do {
            mealLogs = try await api.mealLogs(profileId: profileId, from: from, to: to)
            foodLog = mealLogs.flatMap(\.items)
        } catch {
            report(error)
        }
    }

    func searchFoods(_ query: String, kind: DatasetKind? = nil) async -> [CatalogFood] {
        guard networkEnabled, query.count >= 2 else { return [] }
        do {
            return try await api.searchFoods(query: query, kind: kind, limit: 15)
        } catch is CancellationError {
            return []
        } catch let error as URLError where error.code == .cancelled {
            return []
        } catch {
            report(error)
            return []
        }
    }

    func food(gtin: String) async -> CatalogFood? {
        if let custom = customFoods.first(where: { $0.barcode == gtin }) {
            return custom.catalogFood
        }
        guard networkEnabled else { return nil }
        do {
            return try await api.food(gtin: gtin)
        } catch APIClientError.rejected(let status, _) where status == 404 {
            return nil
        } catch {
            report(error)
            return nil
        }
    }

    func food(datasetKind: DatasetKind, foodId: String) async -> CatalogFood? {
        if datasetKind == .custom, let identifier = UUID(uuidString: foodId) {
            return customFoods.first(where: { $0.id == identifier })?.catalogFood
        }
        if datasetKind == .recipe, let identifier = UUID(uuidString: foodId) {
            return recipes.first(where: { $0.id == identifier })?.catalogFood
        }
        guard networkEnabled else { return nil }
        do {
            return try await api.food(datasetKind: datasetKind, foodId: foodId)
        } catch APIClientError.rejected(let status, _) where status == 404 {
            return nil
        } catch {
            report(error)
            return nil
        }
    }

    func loadLibrary() async {
        guard networkEnabled else { return }
        do {
            async let remoteFoods = api.customFoods(profileId: profileId)
            async let remoteRecipes = api.recipes(profileId: profileId)
            (customFoods, recipes) = try await (remoteFoods, remoteRecipes)
        } catch {
            report(error)
        }
    }

    func estimate(_ request: CreateMealEstimateRequest) async -> MealEstimate? {
        guard networkEnabled else { return nil }
        do {
            return try await api.createMealEstimate(profileId: profileId, request: request)
        } catch is CancellationError {
            return nil
        } catch let error as URLError where error.code == .cancelled {
            return nil
        } catch {
            report(error)
            return nil
        }
    }

    func description(for items: [PendingFoodLogItem]) async -> String? {
        guard networkEnabled, !items.isEmpty else { return nil }
        do {
            return try await api.describeMeal(
                profileId: profileId,
                request: MealDescriptionRequest(items: items)
            )
        } catch {
            report(error)
            return nil
        }
    }

    func photo(mealId: UUID) async -> Data? {
        if let cached = mealPhotoCache[mealId] { return cached }
        guard networkEnabled else { return nil }
        do {
            let data = try await api.mealPhoto(profileId: profileId, mealId: mealId)
            mealPhotoCache[mealId] = data
            return data
        } catch {
            report(error)
            return nil
        }
    }

    func discardEstimate(_ estimateId: UUID) async {
        guard networkEnabled else { return }
        do {
            try await api.discardMealEstimate(profileId: profileId, estimateId: estimateId)
        } catch {
            report(error)
        }
    }

    @discardableResult
    func save(_ draft: MealReviewDraft, updating: Bool = false) async -> Bool {
        guard networkEnabled else { return false }
        do {
            let meal = try await api.saveMealLog(
                profileId: profileId,
                request: SaveMealLogRequest(draft: draft, includePhoto: !updating),
                updating: updating
            )
            upsert(meal)
            if let photoData = draft.photoData {
                mealPhotoCache[meal.mealId] = photoData
            }
            succeed(updating ? "Meal updated" : "Meal logged")
            return true
        } catch {
            report(error)
            return false
        }
    }

    @discardableResult
    func delete(_ mealId: UUID) async -> Bool {
        guard networkEnabled else { return false }
        do {
            try await api.deleteMealLog(profileId: profileId, mealId: mealId)
            mealLogs.removeAll { $0.mealId == mealId }
            foodLog.removeAll { $0.mealId == mealId }
            mealPhotoCache.removeValue(forKey: mealId)
            succeed("Meal deleted")
            return true
        } catch {
            report(error)
            return false
        }
    }

    @discardableResult
    func reschedule(_ mealId: UUID, to date: Date) async -> Bool {
        guard let originalMeal = mealLogs.first(where: { $0.mealId == mealId }) else {
            return false
        }

        let category = MealCategory.inferred(from: date)
        var optimisticMeal = originalMeal
        optimisticMeal.loggedAt = date
        optimisticMeal.mealCategory = category
        optimisticMeal.items = optimisticMeal.items.map { entry in
            var updatedEntry = entry
            updatedEntry.loggedAt = date
            updatedEntry.mealCategory = category
            return updatedEntry
        }
        upsert(optimisticMeal)

        guard networkEnabled else { return true }
        if rescheduleBaselines[mealId] == nil {
            rescheduleBaselines[mealId] = originalMeal
        }

        let previousRequest = rescheduleTasks[mealId]
        let version = UUID()
        rescheduleVersions[mealId] = version

        var draft = MealReviewDraft(meal: optimisticMeal)
        draft.loggedAt = date
        draft.mealCategory = category
        draft.items = draft.items.map {
            PendingFoodLogItem(
                entryId: $0.entryId,
                food: $0.food,
                loggedAt: date,
                mealCategory: category,
                quantityGrams: $0.quantityGrams
            )
        }

        let request = SaveMealLogRequest(draft: draft, includePhoto: false)
        let task = Task { @MainActor [weak self] in
            _ = await previousRequest?.value
            guard let self else { return false }
            return await self.persistReschedule(mealId: mealId, request: request, version: version)
        }
        rescheduleTasks[mealId] = task
        return await task.value
    }

    @discardableResult
    func saveCustomFood(_ request: SaveCustomFoodRequest) async -> CustomFood? {
        do {
            let food: CustomFood
            if networkEnabled {
                food = try await api.saveCustomFood(profileId: profileId, food: request)
            } else {
                food = CustomFood(
                    barcode: request.barcode,
                    brand: request.brand,
                    calories: request.calories,
                    carbohydrates: request.carbohydrates,
                    foodId: request.foodId,
                    imageDataBase64: request.imageDataBase64,
                    name: request.name,
                    nutritionLabelImageDataBase64: request.nutritionLabelImageDataBase64,
                    portions: request.portions,
                    protein: request.protein,
                    sourceKind: .custom,
                    totalFat: request.totalFat
                )
            }
            customFoods.removeAll { $0.id == food.id }
            customFoods.insert(food, at: 0)
            succeed("Custom food saved")
            return food
        } catch {
            report(error)
            return nil
        }
    }

    @discardableResult
    func saveRecipe(_ request: SaveRecipeRequest) async -> Recipe? {
        guard networkEnabled else { return nil }
        do {
            let recipe = try await api.saveRecipe(profileId: profileId, recipe: request)
            recipes.removeAll { $0.id == recipe.id }
            recipes.insert(recipe, at: 0)
            succeed("Recipe saved")
            return recipe
        } catch {
            report(error)
            return nil
        }
    }

    func deleteCustomFood(_ foodId: UUID) async -> Bool {
        do {
            if networkEnabled { try await api.deleteCustomFood(profileId: profileId, foodId: foodId) }
            customFoods.removeAll { $0.id == foodId }
            succeed("Custom food deleted")
            return true
        } catch {
            report(error)
            return false
        }
    }

    func deleteRecipe(_ recipeId: UUID) async -> Bool {
        do {
            if networkEnabled { try await api.deleteRecipe(profileId: profileId, recipeId: recipeId) }
            recipes.removeAll { $0.id == recipeId }
            succeed("Recipe deleted")
            return true
        } catch {
            report(error)
            return false
        }
    }

    @discardableResult
    func log(items: [PendingFoodLogItem]) async -> Bool {
        for item in items {
            guard await log(item) else { return false }
        }
        return true
    }

    @discardableResult
    func update(_ item: PendingFoodLogItem) async -> Bool {
        guard networkEnabled else { return false }
        do {
            let entry = try await saveFoodLogEntry(item)
            upsert(entry)
            succeed("Food log updated")
            return true
        } catch {
            report(error)
            return false
        }
    }

    func rescheduleFood(_ entryId: UUID, to date: Date) async {
        guard let index = foodLog.firstIndex(where: { $0.entryId == entryId }) else { return }
        let original = foodLog[index]
        foodLog[index].loggedAt = date
        do {
            let updated = try await api.logFood(
                profileId: profileId,
                entry: CreateFoodLogEntryRequest(
                    datasetKind: original.datasetKind,
                    entryId: original.entryId,
                    foodId: original.foodId,
                    loggedAt: date,
                    mealCategory: MealCategory.inferred(from: date),
                    quantityGrams: original.quantityGrams
                )
            )
            upsert(updated)
            succeed("Food log updated")
        } catch {
            foodLog[index] = original
            report(error)
        }
    }

    func deleteFood(_ entryId: UUID) async {
        guard networkEnabled else { return }
        do {
            try await api.deleteFoodLogEntry(profileId: profileId, entryId: entryId)
            foodLog.removeAll { $0.entryId == entryId }
            succeed("Food removed")
        } catch {
            report(error)
        }
    }

    func reset() {
        customFoods = []
        foodLog = []
        isLoading = false
        mealLogs = []
        mealPhotoCache = [:]
        recipes = []
        rescheduleBaselines = [:]
        for task in rescheduleTasks.values { task.cancel() }
        rescheduleTasks = [:]
        rescheduleVersions = [:]
    }

    func configurePreview() {
        foodLog = MealStorePreview.foodLog
        mealLogs = foodLog.map(MealStorePreview.meal)
    }

    private func log(_ item: PendingFoodLogItem) async -> Bool {
        guard networkEnabled else { return false }
        do {
            let entry = try await saveFoodLogEntry(item)
            upsert(entry)
            await load(around: item.loggedAt)
            succeed("Food logged")
            return true
        } catch {
            report(error)
            return false
        }
    }

    private func saveFoodLogEntry(_ item: PendingFoodLogItem) async throws -> FoodLogEntry {
        try await api.logFood(
            profileId: profileId,
            entry: CreateFoodLogEntryRequest(
                datasetKind: item.food.datasetKind,
                entryId: item.entryId,
                foodId: item.food.foodId,
                loggedAt: item.loggedAt,
                mealCategory: item.mealCategory,
                quantityGrams: item.quantityGrams
            )
        )
    }

    private func persistReschedule(
        mealId: UUID,
        request: SaveMealLogRequest,
        version: UUID
    ) async -> Bool {
        do {
            let savedMeal = try await api.saveMealLog(
                profileId: profileId,
                request: request,
                updating: true
            )
            rescheduleBaselines[mealId] = savedMeal
            guard rescheduleVersions[mealId] == version else { return true }
            finishReschedule(mealId)
            upsert(savedMeal)
            return true
        } catch {
            guard rescheduleVersions[mealId] == version else { return false }
            let rollback = rescheduleBaselines[mealId]
            finishReschedule(mealId)
            if let rollback { upsert(rollback) }
            report(error)
            return false
        }
    }

    private func finishReschedule(_ mealId: UUID) {
        rescheduleBaselines.removeValue(forKey: mealId)
        rescheduleTasks.removeValue(forKey: mealId)
        rescheduleVersions.removeValue(forKey: mealId)
    }

    private func upsert(_ entry: FoodLogEntry) {
        foodLog.removeAll { $0.entryId == entry.entryId }
        foodLog.append(entry)
        foodLog.sort { $0.loggedAt < $1.loggedAt }
    }

    private func upsert(_ meal: MealLog) {
        mealLogs.removeAll { $0.mealId == meal.mealId }
        mealLogs.append(meal)
        mealLogs.sort { $0.loggedAt < $1.loggedAt }
        foodLog = mealLogs.flatMap(\.items)
    }

    private func succeed(_ message: String) {
        onEvent(.success(message))
    }

    private func report(_ error: Error) {
        onEvent(.failure(error))
    }
}

enum MealStoreEvent {
    case failure(Error)
    case success(String)
}

private enum MealStorePreview {
    static let foodLog = [
        FoodLogEntry(
            brand: nil,
            calories: 95,
            carbohydrates: 25,
            datasetKind: .raw,
            entryId: UUID(uuidString: "00000000-0000-4000-8000-000000000050") ?? UUID(),
            fat: 0.3,
            foodId: "171688",
            gtin: nil,
            loggedAt: Date(timeIntervalSince1970: 1_775_304_000),
            mealId: UUID(uuidString: "00000000-0000-4000-8000-000000000050") ?? UUID(),
            mealCategory: .breakfast,
            name: "Banana",
            protein: 1.2,
            quantityGrams: 100
        ),
        FoodLogEntry(
            brand: "Example Farms",
            calories: 90,
            carbohydrates: 0.4,
            datasetKind: .branded,
            entryId: UUID(uuidString: "00000000-0000-4000-8000-000000000051") ?? UUID(),
            fat: 6.8,
            foodId: "747447",
            gtin: "00000000000005",
            loggedAt: Date(timeIntervalSince1970: 1_775_307_600),
            mealId: UUID(uuidString: "00000000-0000-4000-8000-000000000051") ?? UUID(),
            mealCategory: .breakfast,
            name: "Egg Fried",
            protein: 6.3,
            quantityGrams: 100
        ),
    ]

    static func meal(_ entry: FoodLogEntry) -> MealLog {
        MealLog(
            calories: entry.calories ?? 0,
            carbohydrates: entry.carbohydrates ?? 0,
            description: entry.name,
            estimateId: nil,
            inputKind: nil,
            items: [entry],
            loggedAt: entry.loggedAt,
            mealCategory: entry.mealCategory,
            mealId: entry.mealId,
            photoAvailable: false,
            protein: entry.protein ?? 0,
            totalFat: entry.fat ?? 0
        )
    }
}
