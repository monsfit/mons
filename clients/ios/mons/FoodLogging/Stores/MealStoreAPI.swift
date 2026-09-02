import Foundation

protocol MealStoreAPI: Actor {
    func searchFoods(query: String, kind: DatasetKind?, limit: Int) async throws -> [CatalogFood]
    func food(datasetKind: DatasetKind, foodId: String) async throws -> CatalogFood
    func food(gtin: String) async throws -> CatalogFood
    func logFood(profileId: UUID, entry: CreateFoodLogEntryRequest) async throws -> FoodLogEntry
    func deleteFoodLogEntry(profileId: UUID, entryId: UUID) async throws
    func customFoods(profileId: UUID) async throws -> [CustomFood]
    func saveCustomFood(profileId: UUID, food: SaveCustomFoodRequest) async throws -> CustomFood
    func deleteCustomFood(profileId: UUID, foodId: UUID) async throws
    func recipes(profileId: UUID) async throws -> [Recipe]
    func saveRecipe(profileId: UUID, recipe: SaveRecipeRequest) async throws -> Recipe
    func deleteRecipe(profileId: UUID, recipeId: UUID) async throws
    func createMealEstimate(
        profileId: UUID,
        request estimate: CreateMealEstimateRequest
    ) async throws -> MealEstimate
    func mealLogs(profileId: UUID, from: Date, to: Date) async throws -> [MealLog]
    func saveMealLog(
        profileId: UUID,
        request meal: SaveMealLogRequest,
        updating: Bool
    ) async throws -> MealLog
    func deleteMealLog(profileId: UUID, mealId: UUID) async throws
    func mealPhoto(profileId: UUID, mealId: UUID) async throws -> Data?
    func describeMeal(
        profileId: UUID,
        request description: MealDescriptionRequest
    ) async throws -> String
    func discardMealEstimate(profileId: UUID, estimateId: UUID) async throws
}

extension MonsAPIClient: MealStoreAPI {}
