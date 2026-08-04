import Foundation

struct WorkoutExerciseDraft: Identifiable, Hashable {
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
}
