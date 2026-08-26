import Foundation

struct DashboardSnapshot: Equatable {
    let day: CalorieDayData
    let latestWeightKg: Double?
    let recentWorkout: WorkoutSession?
    let weightChangeKg: Double?
    let weightEntries: [WeightLogEntry]
    let weeklyWorkoutCount: Int
    let weeklyWorkoutMinutes: Int
}
