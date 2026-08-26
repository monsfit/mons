import Foundation

struct WorkoutWeeklySummary: Hashable {
    let sessionCount: Int
    let totalMinutes: Int
    let strengthSessionCount: Int
    let totalSets: Int
    let cardioSessionCount: Int
    let totalDistanceKilometers: Double

    static let zero = WorkoutWeeklySummary(
        sessionCount: 0,
        totalMinutes: 0,
        strengthSessionCount: 0,
        totalSets: 0,
        cardioSessionCount: 0,
        totalDistanceKilometers: 0
    )
}
