import Foundation

nonisolated struct WorkoutExerciseDraft: Identifiable, Hashable, Sendable {
    let id: UUID
    let exercise: ExerciseDefinition
    var sets: [WorkoutLoggingSet]
    var notes: String

    init(
        id: UUID = UUID(),
        exercise: ExerciseDefinition,
        sets: [WorkoutLoggingSet] = [WorkoutLoggingSet(), WorkoutLoggingSet(), WorkoutLoggingSet()],
        notes: String = ""
    ) {
        self.id = id
        self.exercise = exercise
        self.sets = sets
        self.notes = notes
    }

    var completedSetCount: Int {
        sets.count(where: \.isCompleted)
    }

    mutating func addSet(id: UUID = UUID()) {
        let previous = sets.last
        sets.append(
            WorkoutLoggingSet(
                id: id,
                weightPounds: previous?.weightPounds ?? 0,
                repetitions: previous?.repetitions ?? 8,
                restSeconds: previous?.restSeconds ?? 120
            )
        )
    }

    mutating func removeSet(id: UUID) {
        sets.removeAll { $0.id == id }
    }
}
