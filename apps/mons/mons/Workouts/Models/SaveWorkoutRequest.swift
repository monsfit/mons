import Foundation

nonisolated struct SaveWorkoutRequest: Encodable, Sendable {
    let completedAt: Date?
    let distanceKilometers: Double?
    let durationMinutes: Int
    let kind: WorkoutKind
    let sessionId: UUID
    let sets: [SaveWorkoutSetRequest]
    let startedAt: Date
    let title: String
}
