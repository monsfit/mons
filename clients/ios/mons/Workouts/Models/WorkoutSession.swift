import Foundation

nonisolated struct WorkoutSession: Identifiable, Hashable, Sendable {
    let id: String
    let title: String
    let startedAt: Date
    let completedAt: Date
    let durationMinutes: Int
    let metric: WorkoutMetric
    let sets: [WorkoutSet]

    init(
        id: String,
        title: String,
        startedAt: Date? = nil,
        completedAt: Date,
        durationMinutes: Int,
        metric: WorkoutMetric,
        sets: [WorkoutSet] = []
    ) {
        self.id = id
        self.title = title
        self.startedAt = startedAt ?? completedAt
        self.completedAt = completedAt
        self.durationMinutes = durationMinutes
        self.metric = metric
        self.sets = sets
    }

    var distanceKilometers: Double? {
        guard case .cardio(let distanceKilometers) = metric else { return nil }
        return distanceKilometers
    }
}
