import Foundation

enum WorkoutSessionGrouper {
    static func sections(
        for sessions: [WorkoutSession],
        referenceDate: Date,
        calendar: Calendar
    ) -> [WorkoutSessionSection] {
        let weekStart = calendar.dateInterval(of: .weekOfYear, for: referenceDate)?.start
            ?? calendar.startOfDay(for: referenceDate)
        let sortedSessions = sessions.sorted { $0.completedAt > $1.completedAt }
        var grouped: [WorkoutSessionSectionKind: [WorkoutSession]] = [:]

        for session in sortedSessions where session.completedAt <= referenceDate {
            let kind: WorkoutSessionSectionKind
            if calendar.isDate(session.completedAt, inSameDayAs: referenceDate) {
                kind = .today
            } else if session.completedAt >= weekStart {
                kind = .thisWeek
            } else {
                kind = .earlier
            }
            grouped[kind, default: []].append(session)
        }

        return grouped.keys.sorted().map {
            WorkoutSessionSection(kind: $0, sessions: grouped[$0, default: []])
        }
    }
}
