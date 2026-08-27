import Foundation
import Observation

@Observable
@MainActor
final class AppStore {
    let meals: MealStore

    private(set) var isLoadingWorkouts = false
    private(set) var isLoadingWorkoutTemplates = false
    private(set) var isLoadingWeightLog = false
    private(set) var nutritionPlan: NutritionPlan?
    private(set) var profileBootstrapState = ProfileBootstrapState.loading
    private(set) var toast: AppToast?
    private(set) var workouts: [WorkoutSession] = []
    private(set) var workoutTemplates: [SavedWorkoutTemplate] = []
    private(set) var weightLog: [WeightLogEntry] = []

    private(set) var profileId: UUID

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
        meals = MealStore(
            api: api,
            profileId: profileId,
            calendar: calendar,
            networkEnabled: networkEnabled
        )
        meals.connect(profileId: profileId) { [weak self] event in
            switch event {
            case .failure(let error): self?.report(error)
            case .success(let message): self?.showSuccess(message)
            }
        }
    }

    static var preview: AppStore {
        let store = AppStore(
            profileId: UUID(uuidString: "00000000-0000-4000-8000-000000000001")
                ?? ProfileIdentity.current(),
            networkEnabled: false
        )
        store.nutritionPlan = .preview
        store.meals.configurePreview()
        store.weightLog = [
            WeightLogEntry(
                entryId: UUID(uuidString: "00000000-0000-4000-8000-000000000040")
                    ?? UUID(),
                measuredAt: Date(timeIntervalSince1970: 1_774_886_400),
                weightKg: 68.8
            ),
            WeightLogEntry(
                entryId: UUID(uuidString: "00000000-0000-4000-8000-000000000041")
                    ?? UUID(),
                measuredAt: Date(timeIntervalSince1970: 1_775_491_200),
                weightKg: 68.1
            ),
        ]
        store.profileBootstrapState = .ready
        store.workoutTemplates = [
            SavedWorkoutTemplate(
                id: UUID(uuidString: "00000000-0000-4000-8000-000000000060") ?? UUID(),
                name: "Lower Body A",
                exercises: ExerciseCatalog.exercises(for: ExerciseCatalog.templates[1]).map {
                    WorkoutExerciseDraft(exercise: $0)
                }
            )
        ]
        return store
    }

    var calorieGoal: Int { nutritionPlan?.calorieTargetKcal ?? 2_200 }

    func bootstrap(referenceDate: Date = .now) async {
        guard networkEnabled else {
            profileBootstrapState = .ready
            return
        }
        toast = nil
        profileBootstrapState = .loading
        do {
            profileId = try await api.ensureProfile()
            meals.connect(profileId: profileId) { [weak self] event in
                switch event {
                case .failure(let error): self?.report(error)
                case .success(let message): self?.showSuccess(message)
                }
            }
            nutritionPlan = try await api.nutritionPlan(profileId: profileId)
            profileBootstrapState = .ready
            async let foodLog: Void = meals.load(around: referenceDate)
            async let foodLibrary: Void = meals.loadLibrary()
            async let workouts: Void = loadWorkouts(referenceDate: referenceDate)
            async let workoutTemplates: Void = loadWorkoutTemplates()
            async let weightLog: Void = loadWeightLog(referenceDate: referenceDate)
            _ = await (foodLog, foodLibrary, workouts, workoutTemplates, weightLog)
        } catch {
            profileBootstrapState = .failed(message: Self.bootstrapMessage(for: error))
            report(error)
        }
    }

    @discardableResult
    func completeOnboarding(_ draft: OnboardingDraft) async -> Bool {
        guard networkEnabled else {
            nutritionPlan = .preview
            profileBootstrapState = .ready
            return true
        }
        guard profileBootstrapState == .ready else {
            toast = AppToast(
                kind: .error,
                message: "Connect to the API before creating your program."
            )
            return false
        }
        do {
            nutritionPlan = try await api.saveNutritionPlan(
                profileId: profileId,
                request: NutritionPlanCalculator.request(draft: draft)
            )
            showSuccess("Plan saved")
            return true
        } catch {
            report(error)
            return false
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
        } catch {
            report(error)
        }
    }

    func loadWorkoutTemplates() async {
        guard networkEnabled else { return }
        isLoadingWorkoutTemplates = true
        defer { isLoadingWorkoutTemplates = false }
        do {
            workoutTemplates = try await api.workoutTemplates(profileId: profileId).map(Self.workoutTemplate)
        } catch {
            report(error)
        }
    }

    @discardableResult
    func saveWorkoutTemplate(_ template: SavedWorkoutTemplate) async -> SavedWorkoutTemplate? {
        guard networkEnabled else {
            upsert(template)
            showSuccess("Template saved")
            return template
        }
        do {
            let remote = try await api.saveWorkoutTemplate(
                profileId: profileId,
                template: SaveWorkoutTemplateRequest(template: template)
            )
            let saved = Self.workoutTemplate(remote)
            upsert(saved)
            showSuccess("Template saved")
            return saved
        } catch {
            report(error)
            return nil
        }
    }

    @discardableResult
    func deleteWorkoutTemplate(_ templateId: UUID) async -> Bool {
        guard networkEnabled else {
            workoutTemplates.removeAll { $0.id == templateId }
            showSuccess("Template deleted")
            return true
        }
        do {
            try await api.deleteWorkoutTemplate(profileId: profileId, templateId: templateId)
            workoutTemplates.removeAll { $0.id == templateId }
            showSuccess("Template deleted")
            return true
        } catch {
            report(error)
            return false
        }
    }

    func loadWeightLog(referenceDate: Date = .now) async {
        guard networkEnabled else { return }
        isLoadingWeightLog = true
        defer { isLoadingWeightLog = false }
        let to = calendar.date(byAdding: .day, value: 1, to: referenceDate) ?? referenceDate
        let from = calendar.date(byAdding: .year, value: -1, to: referenceDate) ?? referenceDate
        do {
            weightLog = try await api.weightLog(profileId: profileId, from: from, to: to).sorted()
        } catch {
            report(error)
        }
    }

    @discardableResult
    func logWeight(
        weightKg: Double,
        measuredAt: Date,
        entryId: UUID = UUID()
    ) async -> Bool {
        guard networkEnabled else { return false }
        do {
            let entry = try await api.saveWeight(
                profileId: profileId,
                entry: SaveWeightLogEntryRequest(
                    entryId: entryId,
                    measuredAt: measuredAt,
                    weightKg: weightKg
                )
            )
            weightLog.removeAll { $0.entryId == entry.entryId }
            weightLog.append(entry)
            weightLog.sort()
            showSuccess("Weight saved")
            return true
        } catch {
            report(error)
            return false
        }
    }

    func deleteWeightLogEntry(_ entryId: UUID) async {
        guard networkEnabled else { return }
        do {
            try await api.deleteWeightLogEntry(profileId: profileId, entryId: entryId)
            weightLog.removeAll { $0.entryId == entryId }
            showSuccess("Weight entry deleted")
        } catch {
            report(error)
        }
    }

    @discardableResult
    func saveWorkout(_ request: SaveWorkoutRequest) async -> Bool {
        guard networkEnabled else {
            upsert(Self.workoutSession(request))
            showSuccess("Workout saved")
            return true
        }
        do {
            let remote = try await api.saveWorkout(profileId: profileId, workout: request)
            upsert(Self.workoutSession(remote))
            showSuccess("Workout saved")
            return true
        } catch {
            report(error)
            return false
        }
    }

    @discardableResult
    func deleteWorkout(_ sessionId: UUID) async -> Bool {
        guard networkEnabled else {
            workouts.removeAll { $0.id == sessionId.uuidString }
            showSuccess("Workout deleted")
            return true
        }
        do {
            try await api.deleteWorkout(profileId: profileId, sessionId: sessionId)
            workouts.removeAll { $0.id == sessionId.uuidString }
            showSuccess("Workout deleted")
            return true
        } catch {
            report(error)
            return false
        }
    }

    func dismissToast(_ toastId: UUID) {
        guard toast?.id == toastId else { return }
        toast = nil
    }

    func showSuccess(_ message: String, id: UUID = UUID()) {
        toast = AppToast(id: id, kind: .success, message: message)
    }

    func resetForAuthenticationChange() {
        meals.reset()
        profileBootstrapState = .loading
        isLoadingWorkouts = false
        isLoadingWorkoutTemplates = false
        isLoadingWeightLog = false
        nutritionPlan = nil
        toast = nil
        workouts = []
        workoutTemplates = []
        weightLog = []
    }

    private func upsert(_ template: SavedWorkoutTemplate) {
        workoutTemplates.removeAll { $0.id == template.id }
        workoutTemplates.insert(template, at: 0)
    }

    private func upsert(_ workout: WorkoutSession) {
        workouts.removeAll { $0.id == workout.id }
        workouts.append(workout)
        workouts.sort { $0.completedAt > $1.completedAt }
    }

    private func report(_ error: Error) {
        toast = AppToast(kind: .error, message: error.localizedDescription)
    }

    private static func bootstrapMessage(for error: Error) -> String {
        if error is URLError {
            return "Confirm the development API is running and reachable, then try again."
        }
        return error.localizedDescription
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
            startedAt: remote.startedAt,
            completedAt: remote.completedAt ?? remote.startedAt,
            durationMinutes: remote.durationMinutes,
            metric: metric,
            sets: sets
        )
    }

    private static func workoutSession(_ request: SaveWorkoutRequest) -> WorkoutSession {
        let sets = request.sets.map {
            WorkoutSet(
                id: $0.setId.uuidString,
                title: $0.title,
                detail: $0.detail,
                value: $0.value
            )
        }
        let metric: WorkoutMetric = if request.kind == .cardio {
            .cardio(distanceKilometers: request.distanceKilometers ?? 0)
        } else {
            .strength(exercises: Set(request.sets.map(\.title)).count, sets: request.sets.count)
        }
        return WorkoutSession(
            id: request.sessionId.uuidString,
            title: request.title,
            startedAt: request.startedAt,
            completedAt: request.completedAt ?? request.startedAt,
            durationMinutes: request.durationMinutes,
            metric: metric,
            sets: sets
        )
    }

    private static func workoutTemplate(_ remote: RemoteWorkoutTemplate) -> SavedWorkoutTemplate {
        SavedWorkoutTemplate(
            id: remote.templateId,
            name: remote.name,
            exercises: remote.exercises.map { exercise in
                WorkoutExerciseDraft(
                    id: exercise.templateExerciseId,
                    exercise: ExerciseDefinition(
                        id: exercise.exerciseId,
                        name: exercise.name,
                        category: exercise.category,
                        equipment: exercise.equipment
                    ),
                    sets: exercise.sets.map { workoutSet in
                        WorkoutLoggingSet(
                            id: workoutSet.setId,
                            weightPounds: workoutSet.weightPounds,
                            repetitions: workoutSet.repetitions,
                            restSeconds: workoutSet.restSeconds
                        )
                    },
                    notes: exercise.notes
                )
            }
        )
    }
}
