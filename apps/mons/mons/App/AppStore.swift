import Foundation
import Observation

@Observable
@MainActor
final class AppStore {
    private(set) var foodLog: [FoodLogEntry] = []
    private(set) var hasLoadedNutritionPlan = false
    private(set) var isLoadingFoodLog = false
    private(set) var isLoadingWorkouts = false
    private(set) var lastError: String?
    private(set) var nutritionPlan: NutritionPlan?
    private(set) var workouts: [WorkoutSession] = []

    let profileId: UUID

    @ObservationIgnored private let api: RegolithAPIClient
    @ObservationIgnored private let calendar: Calendar
    @ObservationIgnored private let networkEnabled: Bool

    init(
        api: RegolithAPIClient = RegolithAPIClient(configuration: .bundled),
        profileId: UUID = ProfileIdentity.current(),
        calendar: Calendar = .current,
        networkEnabled: Bool = true
    ) {
        self.api = api
        self.profileId = profileId
        self.calendar = calendar
        self.networkEnabled = networkEnabled
    }

    static var preview: AppStore {
        let store = AppStore(
            profileId: UUID(uuidString: "00000000-0000-4000-8000-000000000001")
                ?? ProfileIdentity.current(),
            networkEnabled: false
        )
        store.nutritionPlan = .preview
        store.hasLoadedNutritionPlan = true
        return store
    }

    var calorieGoal: Int { nutritionPlan?.calorieTargetKcal ?? 2_200 }

    func bootstrap(referenceDate: Date = .now) async {
        guard networkEnabled else {
            hasLoadedNutritionPlan = true
            return
        }
        defer { hasLoadedNutritionPlan = true }
        do {
            try await api.ensureProfile(profileId)
            nutritionPlan = try await api.nutritionPlan(profileId: profileId)
            await loadFoodLog(around: referenceDate)
            await loadWorkouts(referenceDate: referenceDate)
        } catch {
            report(error)
        }
    }

    @discardableResult
    func completeOnboarding(_ draft: OnboardingDraft) async -> Bool {
        guard networkEnabled else {
            nutritionPlan = .preview
            hasLoadedNutritionPlan = true
            return true
        }
        do {
            nutritionPlan = try await api.saveNutritionPlan(
                profileId: profileId,
                request: NutritionPlanCalculator.request(draft: draft)
            )
            lastError = nil
            hasLoadedNutritionPlan = true
            return true
        } catch {
            report(error)
            return false
        }
    }

    func loadFoodLog(around date: Date) async {
        guard networkEnabled else { return }
        isLoadingFoodLog = true
        defer { isLoadingFoodLog = false }
        let day = calendar.startOfDay(for: date)
        let from = calendar.date(byAdding: .day, value: -7, to: day) ?? day
        let to = calendar.date(byAdding: .day, value: 8, to: day) ?? day
        do {
            foodLog = try await api.foodLog(profileId: profileId, from: from, to: to)
            lastError = nil
        } catch {
            report(error)
        }
    }

    func searchFoods(_ query: String, kind: DatasetKind? = nil) async -> [CatalogFood] {
        guard networkEnabled, query.count >= 2 else { return [] }
        do {
            let foods = try await api.searchFoods(query: query, kind: kind)
            lastError = nil
            return foods
        } catch {
            report(error)
            return []
        }
    }

    func food(gtin: String) async -> CatalogFood? {
        guard networkEnabled else { return nil }
        do {
            let food = try await api.food(gtin: gtin)
            lastError = nil
            return food
        } catch {
            report(error)
            return nil
        }
    }

    @discardableResult
    func log(
        food: CatalogFood,
        quantityGrams: Double,
        category: MealCategory,
        loggedAt: Date,
        entryId: UUID = UUID()
    ) async -> Bool {
        guard networkEnabled else { return false }
        do {
            let entry = try await api.logFood(
                profileId: profileId,
                entry: CreateFoodLogEntryRequest(
                    datasetKind: food.datasetKind,
                    entryId: entryId,
                    foodId: food.foodId,
                    loggedAt: loggedAt,
                    mealCategory: category,
                    quantityGrams: quantityGrams
                )
            )
            upsert(entry)
            lastError = nil
            return true
        } catch {
            report(error)
            return false
        }
    }

    func rescheduleFoodLogEntry(_ entryId: UUID, to date: Date) async {
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
                    mealCategory: original.mealCategory,
                    quantityGrams: original.quantityGrams
                )
            )
            upsert(updated)
            lastError = nil
        } catch {
            foodLog[index] = original
            report(error)
        }
    }

    func deleteFoodLogEntry(_ entryId: UUID) async {
        guard networkEnabled else { return }
        do {
            try await api.deleteFoodLogEntry(profileId: profileId, entryId: entryId)
            foodLog.removeAll { $0.entryId == entryId }
            lastError = nil
        } catch {
            report(error)
        }
    }

    func loadWorkouts(referenceDate: Date = .now) async {
        guard networkEnabled else { return }
        isLoadingWorkouts = true
        defer { isLoadingWorkouts = false }
        let to = calendar.date(byAdding: .day, value: 1, to: referenceDate) ?? referenceDate
        let from = calendar.date(byAdding: .year, value: -1, to: referenceDate) ?? referenceDate
        do {
            let remote = try await api.workouts(profileId: profileId, from: from, to: to)
            workouts = remote.map(Self.workoutSession)
            lastError = nil
        } catch {
            report(error)
        }
    }

    @discardableResult
    func saveWorkout(_ request: SaveWorkoutRequest) async -> Bool {
        guard networkEnabled else { return false }
        do {
            let remote = try await api.saveWorkout(profileId: profileId, workout: request)
            let saved = Self.workoutSession(remote)
            workouts.removeAll { $0.id == saved.id }
            workouts.append(saved)
            workouts.sort { $0.completedAt > $1.completedAt }
            lastError = nil
            return true
        } catch {
            report(error)
            return false
        }
    }

    func clearError() {
        lastError = nil
    }

    private func upsert(_ entry: FoodLogEntry) {
        foodLog.removeAll { $0.entryId == entry.entryId }
        foodLog.append(entry)
        foodLog.sort { $0.loggedAt < $1.loggedAt }
    }

    private func report(_ error: Error) {
        lastError = error.localizedDescription
    }

    private static func workoutSession(_ remote: RemoteWorkout) -> WorkoutSession {
        let sets = remote.sets.map {
            WorkoutSet(
                id: $0.setId.uuidString,
                title: $0.title,
                detail: $0.detail,
                value: $0.value
            )
        }
        let metric: WorkoutMetric = if remote.kind == .cardio {
            .cardio(distanceKilometers: remote.distanceKilometers ?? 0)
        } else {
            .strength(exercises: Set(remote.sets.map(\.title)).count, sets: remote.sets.count)
        }
        return WorkoutSession(
            id: remote.sessionId.uuidString,
            title: remote.title,
            completedAt: remote.completedAt ?? remote.startedAt,
            durationMinutes: remote.durationMinutes,
            metric: metric,
            sets: sets
        )
    }
}
