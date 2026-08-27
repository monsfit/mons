import Foundation

nonisolated struct RemoteWorkout: Codable, Identifiable, Sendable {
    let completedAt: Date?
    let distanceKilometers: Double?
    let durationMinutes: Int
    let kind: WorkoutKind
    let sessionId: UUID
    let sets: [RemoteWorkoutSet]
    let startedAt: Date
    let title: String

    var id: UUID { sessionId }
}
