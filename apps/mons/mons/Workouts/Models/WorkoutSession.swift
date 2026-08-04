import Foundation

struct WorkoutSession: Identifiable, Hashable {
    let id: String
    let title: String
    let completedAt: Date
    let durationMinutes: Int
    let metric: WorkoutMetric
    let sets: [WorkoutSet]

    init(
        id: String,
        title: String,
        completedAt: Date,
        durationMinutes: Int,
        metric: WorkoutMetric,
        sets: [WorkoutSet] = []
    ) {
        self.id = id
        self.title = title
        self.completedAt = completedAt
        self.durationMinutes = durationMinutes
        self.metric = metric
        self.sets = sets
    }

    func replacingSets(with sets: [WorkoutSet]) -> WorkoutSession {
        WorkoutSession(
            id: id,
            title: title,
            completedAt: completedAt,
            durationMinutes: durationMinutes,
            metric: metric,
            sets: sets
        )
    }
}
