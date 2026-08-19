import Foundation

nonisolated struct WorkoutSessionDraft: Equatable, Identifiable, Sendable {
    let sessionId: UUID
    var title: String
    var kind: WorkoutKind
    var startedAt: Date
    var completedAt: Date
    var durationMinutes: Int
    var distanceKilometers: Double
    var exercises: [WorkoutExerciseDraft]

    var id: UUID { sessionId }

    init?(session: WorkoutSession) {
        guard let sessionId = UUID(uuidString: session.id) else { return nil }
        guard let exercises = Self.exercises(from: session.sets) else { return nil }

        self.sessionId = sessionId
        title = session.title
        kind = session.metric.kind
        startedAt = session.startedAt
        completedAt = session.completedAt
        durationMinutes = session.durationMinutes
        distanceKilometers = session.distanceKilometers ?? 0
        self.exercises = exercises
    }

    var isValid: Bool {
        !trimmedTitle.isEmpty
            && durationMinutes >= 0
            && completedAt >= startedAt
            && (kind == .strength || distanceKilometers >= 0)
            && exercises.allSatisfy { exercise in
                !exercise.exercise.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                    && !exercise.sets.isEmpty
                    && exercise.sets.allSatisfy { $0.repetitions > 0 && $0.weightPounds >= 0 }
            }
    }

    var request: SaveWorkoutRequest {
        SaveWorkoutRequest(
            completedAt: completedAt,
            distanceKilometers: kind == .cardio ? distanceKilometers : nil,
            durationMinutes: durationMinutes,
            kind: kind,
            sessionId: sessionId,
            sets: WorkoutRequestBuilder.recordedSetRequests(exercises: exercises),
            startedAt: startedAt,
            title: trimmedTitle
        )
    }

    mutating func addExercise(_ exercise: ExerciseDefinition, id: UUID = UUID()) {
        guard !exercises.contains(where: { $0.exercise.id == exercise.id }) else { return }
        exercises.append(WorkoutExerciseDraft(id: id, exercise: exercise))
    }

    mutating func removeExercise(id: UUID) {
        exercises.removeAll { $0.id == id }
    }

    private var trimmedTitle: String {
        title.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func exercises(from storedSets: [WorkoutSet]) -> [WorkoutExerciseDraft]? {
        var order: [String] = []
        var groups: [String: [ParsedWorkoutSet]] = [:]

        for storedSet in storedSets {
            guard let parsedSet = ParsedWorkoutSet(storedSet) else { return nil }
            let key = parsedSet.exerciseName.lowercased()
            if groups[key] == nil { order.append(key) }
            groups[key, default: []].append(parsedSet)
        }

        return order.compactMap { key in
            guard let group = groups[key], let first = group.first else { return nil }
            let catalogExercise = ExerciseCatalog.exercises.first {
                $0.name.compare(first.exerciseName, options: [.caseInsensitive, .diacriticInsensitive]) == .orderedSame
            }
            let definition = catalogExercise ?? ExerciseDefinition(
                id: "recorded-\(key)",
                name: first.exerciseName,
                category: "Recorded",
                equipment: group.contains(where: { $0.workoutSet.weightPounds > 0 }) ? "Weighted" : "Bodyweight"
            )
            let notes = group.compactMap(\.note).first ?? ""
            return WorkoutExerciseDraft(
                id: first.workoutSet.id,
                exercise: definition,
                sets: group.map(\.workoutSet),
                notes: notes
            )
        }
    }
}

nonisolated private struct ParsedWorkoutSet {
    let exerciseName: String
    let note: String?
    let workoutSet: WorkoutLoggingSet

    init?(_ storedSet: WorkoutSet) {
        guard let identifier = UUID(uuidString: storedSet.id) else { return nil }
        let name = storedSet.title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return nil }

        let segments = storedSet.detail
            .components(separatedBy: " · ")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        let repetitions = segments.compactMap(Self.repetitions).first ?? 8
        let restSeconds = segments.compactMap(Self.restSeconds).first ?? 120
        let notes = segments.filter {
            !Self.isSetNumber($0) && Self.repetitions($0) == nil && Self.restSeconds($0) == nil
        }

        exerciseName = name
        note = notes.isEmpty ? nil : notes.joined(separator: " · ")
        workoutSet = WorkoutLoggingSet(
            id: identifier,
            weightPounds: Self.weightPounds(storedSet.value),
            repetitions: repetitions,
            restSeconds: restSeconds,
            isCompleted: true
        )
    }

    private static func isSetNumber(_ value: String) -> Bool {
        let words = value.split(separator: " ")
        return words.count == 2 && words[0].caseInsensitiveCompare("Set") == .orderedSame && Int(words[1]) != nil
    }

    private static func repetitions(_ value: String) -> Int? {
        let suffix = " reps"
        guard value.lowercased().hasSuffix(suffix) else { return nil }
        return Int(value.dropLast(suffix.count).trimmingCharacters(in: .whitespaces))
    }

    private static func restSeconds(_ value: String) -> Int? {
        let suffix = " rest"
        guard value.lowercased().hasSuffix(suffix) else { return nil }
        let time = value.dropLast(suffix.count).split(separator: ":")
        guard time.count == 2, let minutes = Int(time[0]), let seconds = Int(time[1]) else { return nil }
        return max(minutes * 60 + seconds, 0)
    }

    private static func weightPounds(_ value: String) -> Double {
        let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard let amount = Double(normalized.split(separator: " ").first ?? "") else { return 0 }
        return normalized.hasSuffix(" kg") ? amount * 2.204_622_621_8 : amount
    }
}
