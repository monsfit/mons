import Foundation

actor MonsAPIClient {
    private let authorizationTokenProvider: any AuthorizationTokenProviding
    private let catalogFoodCache: CatalogFoodCache
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    private let requestBuilder: AuthenticatedRequestBuilder
    private let session: URLSession

    init(
        configuration: APIConfiguration,
        session: URLSession = .shared,
        catalogFoodCache: CatalogFoodCache = CatalogFoodCache(),
        authorizationTokenProvider: any AuthorizationTokenProviding = ClerkAuthorizationTokenProvider()
    ) {
        requestBuilder = AuthenticatedRequestBuilder(baseURL: configuration.baseURL)
        self.session = session
        self.catalogFoodCache = catalogFoodCache
        self.authorizationTokenProvider = authorizationTokenProvider

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        self.decoder = decoder

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        self.encoder = encoder
    }

    func ensureProfile() async throws -> UUID {
        let response: ProfileResponse = try await request(
            path: ["v1", "profile"],
            method: "PUT"
        )
        return response.profileId
    }

    func nutritionPlan(profileId: UUID) async throws -> NutritionPlan? {
        let response: NutritionPlanResponse = try await request(
            path: ["v1", "profiles", profileId.uuidString, "nutrition-plan"]
        )
        return response.plan
    }

    func saveNutritionPlan(
        profileId: UUID,
        request plan: SaveNutritionPlanRequest
    ) async throws -> NutritionPlan {
        try await request(
            path: ["v1", "profiles", profileId.uuidString, "nutrition-plan"],
            method: "PUT",
            body: try encoder.encode(plan)
        )
    }

    func searchFoods(
        query: String,
        kind: DatasetKind? = nil,
        limit: Int = 15
    ) async throws -> [CatalogFood] {
        var queryItems = [
            URLQueryItem(name: "q", value: query),
            URLQueryItem(name: "limit", value: limit.formatted())
        ]
        if let kind {
            queryItems.append(URLQueryItem(name: "kind", value: kind.rawValue))
        }
        let response: FoodSearchResponse = try await request(
            path: ["v1", "foods", "search"],
            query: queryItems
        )
        await catalogFoodCache.activate(releaseId: response.catalogReleaseId)
        return response.foods.map(\.catalogFood)
    }

    func food(gtin: String) async throws -> CatalogFood {
        if let cached = await catalogFoodCache.food(gtin: gtin) {
            return cached
        }
        let response: FoodItemResponse = try await request(
            path: ["v1", "foods", "by-gtin", gtin]
        )
        await catalogFoodCache.insert(response.food, releaseId: response.catalogReleaseId)
        return response.food
    }

    func food(datasetKind: DatasetKind, foodId: String) async throws -> CatalogFood {
        if let cached = await catalogFoodCache.food(datasetKind: datasetKind, foodId: foodId) {
            return cached
        }
        let response: FoodItemResponse = try await request(
            path: ["v1", "foods", datasetKind.rawValue, foodId]
        )
        await catalogFoodCache.insert(response.food, releaseId: response.catalogReleaseId)
        return response.food
    }

    func foodLog(profileId: UUID, from: Date, to: Date) async throws -> [FoodLogEntry] {
        let response: FoodLogResponse = try await request(
            path: ["v1", "profiles", profileId.uuidString, "food-log"],
            query: timeRange(from: from, to: to)
        )
        return response.entries
    }

    func logFood(profileId: UUID, entry: CreateFoodLogEntryRequest) async throws -> FoodLogEntry {
        try await request(
            path: ["v1", "profiles", profileId.uuidString, "food-log"],
            method: "POST",
            body: try encoder.encode(entry)
        )
    }

    func deleteFoodLogEntry(profileId: UUID, entryId: UUID) async throws {
        try await requestWithoutContent(
            path: ["v1", "profiles", profileId.uuidString, "food-log", entryId.uuidString],
            method: "DELETE"
        )
    }

    func customFoods(profileId: UUID) async throws -> [CustomFood] {
        let response: CustomFoodResponse = try await request(
            path: ["v1", "profiles", profileId.uuidString, "custom-foods"]
        )
        return response.foods
    }

    func saveCustomFood(
        profileId: UUID,
        food: SaveCustomFoodRequest
    ) async throws -> CustomFood {
        try await request(
            path: ["v1", "profiles", profileId.uuidString, "custom-foods", food.foodId.uuidString],
            method: "PUT",
            body: try encoder.encode(food)
        )
    }

    func deleteCustomFood(profileId: UUID, foodId: UUID) async throws {
        try await requestWithoutContent(
            path: ["v1", "profiles", profileId.uuidString, "custom-foods", foodId.uuidString],
            method: "DELETE"
        )
    }

    func recipes(profileId: UUID) async throws -> [Recipe] {
        let response: RecipeResponse = try await request(
            path: ["v1", "profiles", profileId.uuidString, "recipes"]
        )
        return response.recipes
    }

    func saveRecipe(profileId: UUID, recipe: SaveRecipeRequest) async throws -> Recipe {
        try await request(
            path: ["v1", "profiles", profileId.uuidString, "recipes", recipe.recipeId.uuidString],
            method: "PUT",
            body: try encoder.encode(recipe)
        )
    }

    func deleteRecipe(profileId: UUID, recipeId: UUID) async throws {
        try await requestWithoutContent(
            path: ["v1", "profiles", profileId.uuidString, "recipes", recipeId.uuidString],
            method: "DELETE"
        )
    }

    func createMealEstimate(
        profileId: UUID,
        request estimate: CreateMealEstimateRequest
    ) async throws -> MealEstimate {
        try await request(
            path: ["v1", "profiles", profileId.uuidString, "meal-estimates"],
            method: "POST",
            body: try encoder.encode(estimate),
            timeoutInterval: 180
        )
    }

    func mealLogs(profileId: UUID, from: Date, to: Date) async throws -> [MealLog] {
        let response: MealLogResponse = try await request(
            path: ["v1", "profiles", profileId.uuidString, "meal-logs"],
            query: timeRange(from: from, to: to)
        )
        return response.meals
    }

    func saveMealLog(
        profileId: UUID,
        request meal: SaveMealLogRequest,
        updating: Bool
    ) async throws -> MealLog {
        try await request(
            path: updating
                ? ["v1", "profiles", profileId.uuidString, "meal-logs", meal.mealId.uuidString]
                : ["v1", "profiles", profileId.uuidString, "meal-logs"],
            method: updating ? "PUT" : "POST",
            body: try encoder.encode(meal)
        )
    }

    func deleteMealLog(profileId: UUID, mealId: UUID) async throws {
        try await requestWithoutContent(
            path: ["v1", "profiles", profileId.uuidString, "meal-logs", mealId.uuidString],
            method: "DELETE"
        )
    }

    func mealPhoto(profileId: UUID, mealId: UUID) async throws -> Data? {
        let response: MealPhotoResponse = try await request(
            path: ["v1", "profiles", profileId.uuidString, "meal-logs", mealId.uuidString, "photo"]
        )
        return response.data
    }

    func describeMeal(
        profileId: UUID,
        request description: MealDescriptionRequest
    ) async throws -> String {
        let response: MealDescriptionResponse = try await request(
            path: ["v1", "profiles", profileId.uuidString, "meal-descriptions"],
            method: "POST",
            body: try encoder.encode(description)
        )
        return response.description
    }

    func discardMealEstimate(profileId: UUID, estimateId: UUID) async throws {
        try await requestWithoutContent(
            path: ["v1", "profiles", profileId.uuidString, "meal-estimates", estimateId.uuidString],
            method: "DELETE"
        )
    }

    func weightLog(profileId: UUID, from: Date, to: Date) async throws -> [WeightLogEntry] {
        let response: WeightLogResponse = try await request(
            path: ["v1", "profiles", profileId.uuidString, "weight-log"],
            query: timeRange(from: from, to: to)
        )
        return response.entries
    }

    func saveWeight(
        profileId: UUID,
        entry: SaveWeightLogEntryRequest
    ) async throws -> WeightLogEntry {
        try await request(
            path: ["v1", "profiles", profileId.uuidString, "weight-log"],
            method: "POST",
            body: try encoder.encode(entry)
        )
    }

    func deleteWeightLogEntry(profileId: UUID, entryId: UUID) async throws {
        try await requestWithoutContent(
            path: ["v1", "profiles", profileId.uuidString, "weight-log", entryId.uuidString],
            method: "DELETE"
        )
    }

    func workouts(profileId: UUID, from: Date, to: Date) async throws -> [RemoteWorkout] {
        let response: WorkoutResponse = try await request(
            path: ["v1", "profiles", profileId.uuidString, "workouts"],
            query: timeRange(from: from, to: to)
        )
        return response.workouts
    }

    func workoutTemplates(profileId: UUID) async throws -> [RemoteWorkoutTemplate] {
        let response: WorkoutTemplateResponse = try await request(
            path: ["v1", "profiles", profileId.uuidString, "workout-templates"]
        )
        return response.templates
    }

    func saveWorkoutTemplate(
        profileId: UUID,
        template: SaveWorkoutTemplateRequest
    ) async throws -> RemoteWorkoutTemplate {
        try await request(
            path: [
                "v1", "profiles", profileId.uuidString, "workout-templates",
                template.templateId.uuidString
            ],
            method: "PUT",
            body: try encoder.encode(template)
        )
    }

    func deleteWorkoutTemplate(profileId: UUID, templateId: UUID) async throws {
        try await requestWithoutContent(
            path: [
                "v1", "profiles", profileId.uuidString, "workout-templates",
                templateId.uuidString
            ],
            method: "DELETE"
        )
    }

    func saveWorkout(profileId: UUID, workout: SaveWorkoutRequest) async throws -> RemoteWorkout {
        try await request(
            path: [
                "v1", "profiles", profileId.uuidString, "workouts", workout.sessionId.uuidString
            ],
            method: "PUT",
            body: try encoder.encode(workout)
        )
    }

    func deleteWorkout(profileId: UUID, sessionId: UUID) async throws {
        try await requestWithoutContent(
            path: ["v1", "profiles", profileId.uuidString, "workouts", sessionId.uuidString],
            method: "DELETE"
        )
    }

    private func request<Response: Decodable & Sendable>(
        path: [String],
        method: String = "GET",
        query: [URLQueryItem] = [],
        body: Data? = nil,
        timeoutInterval: TimeInterval? = nil
    ) async throws -> Response {
        let (data, response) = try await session.data(for: try await urlRequest(
            path: path,
            method: method,
            query: query,
            body: body,
            timeoutInterval: timeoutInterval
        ))
        try validate(response: response, data: data)
        return try decoder.decode(Response.self, from: data)
    }

    private func requestWithoutContent(
        path: [String],
        method: String
    ) async throws {
        let (data, response) = try await session.data(for: try await urlRequest(
            path: path,
            method: method
        ))
        try validate(response: response, data: data)
    }

    private func urlRequest(
        path: [String],
        method: String,
        query: [URLQueryItem] = [],
        body: Data? = nil,
        timeoutInterval: TimeInterval? = nil
    ) async throws -> URLRequest {
        let token = try await authorizationTokenProvider.token()
        return try requestBuilder.request(
            path: path,
            method: method,
            query: query,
            body: body,
            token: token,
            timeoutInterval: timeoutInterval
        )
    }

    private func validate(response: URLResponse, data: Data) throws {
        guard let response = response as? HTTPURLResponse else {
            throw APIClientError.invalidResponse
        }
        guard (200..<300).contains(response.statusCode) else {
            let payload = try? decoder.decode(APIErrorPayload.self, from: data)
            throw APIClientError.rejected(
                status: response.statusCode,
                message: payload?.message ?? "The server rejected the request."
            )
        }
    }

    private func timeRange(from: Date, to: Date) -> [URLQueryItem] {
        [
            URLQueryItem(name: "from", value: from.formatted(.iso8601)),
            URLQueryItem(name: "to", value: to.formatted(.iso8601))
        ]
    }
}
