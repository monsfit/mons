import Foundation

struct SavedWorkoutTemplate: Identifiable, Hashable, Sendable {
    let id: UUID
    var name: String
    var exercises: [WorkoutExerciseDraft]

    init(id: UUID = UUID(), name: String, exercises: [WorkoutExerciseDraft]) {
        self.id = id
        self.name = name
        self.exercises = exercises
    }
}
