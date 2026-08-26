import Foundation

enum WorkoutAnalytics {
    static func weeklySummary(
        for sessions: [WorkoutSession],
        referenceDate: Date,
        calendar: Calendar
    ) -> WorkoutWeeklySummary {
        guard let week = calendar.dateInterval(of: .weekOfYear, for: referenceDate) else {
            return .zero
        }

        let weeklySessions = sessions.filter {
            week.contains($0.completedAt) && $0.completedAt <= referenceDate
        }

        var strengthSessionCount = 0
        var totalSets = 0
        var cardioSessionCount = 0
        var totalDistanceKilometers = 0.0

        for session in weeklySessions {
            switch session.metric {
            case .strength(_, let sets):
                strengthSessionCount += 1
                totalSets += sets
            case .cardio(let distanceKilometers):
                cardioSessionCount += 1
                totalDistanceKilometers += distanceKilometers
            }
        }

        return WorkoutWeeklySummary(
            sessionCount: weeklySessions.count,
            totalMinutes: weeklySessions.reduce(0) { $0 + $1.durationMinutes },
            strengthSessionCount: strengthSessionCount,
            totalSets: totalSets,
            cardioSessionCount: cardioSessionCount,
            totalDistanceKilometers: totalDistanceKilometers
        )
    }
}
