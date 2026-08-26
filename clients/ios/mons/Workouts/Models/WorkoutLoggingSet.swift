import Foundation

nonisolated struct WorkoutLoggingSet: Identifiable, Hashable, Sendable {
    let id: UUID
    var weightPounds: Double
    var repetitions: Int
    var restSeconds: Int
    var isCompleted: Bool

    init(
        id: UUID = UUID(),
        weightPounds: Double = 0,
        repetitions: Int = 8,
        restSeconds: Int = 120,
        isCompleted: Bool = false
    ) {
        self.id = id
        self.weightPounds = weightPounds
        self.repetitions = repetitions
        self.restSeconds = restSeconds
        self.isCompleted = isCompleted
    }
}
