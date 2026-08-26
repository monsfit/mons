import Foundation

struct ActiveWorkoutDraft: Hashable, Sendable {
    var exercises: [WorkoutExerciseDraft]
    let sessionId: UUID
    let startedAt: Date
    let templateId: UUID
    let title: String
}
