import Foundation
import Testing
@testable import mons

struct WorkoutLogicTests {
    @Test func groupsSessionsByCalendarRecencyAndExcludesFutureSessions() throws {
        let calendar = testCalendar()
        let referenceDate = try #require(calendar.date(from: DateComponents(year: 2026, month: 8, day: 5, hour: 12)))
        let sessions = [
            session(id: "today", date: date(day: 5, hour: 8, calendar: calendar)),
            session(id: "week", date: date(day: 3, hour: 8, calendar: calendar)),
            session(id: "earlier", date: date(day: 2, hour: 8, calendar: calendar)),
            session(id: "future", date: date(day: 5, hour: 18, calendar: calendar))
        ]

        let sections = WorkoutSessionGrouper.sections(
            for: sessions,
            referenceDate: referenceDate,
            calendar: calendar
        )

        #expect(sections.map(\.kind) == [.today, .thisWeek, .earlier])
        #expect(sections.flatMap(\.sessions).map(\.id) == ["today", "week", "earlier"])
    }

    @Test func calculatesWeeklyStrengthAndCardioTotals() throws {
        let calendar = testCalendar()
        let referenceDate = try #require(calendar.date(from: DateComponents(year: 2026, month: 8, day: 5, hour: 12)))
        let sessions = [
            WorkoutSession(
                id: "strength",
                title: "Strength",
                completedAt: date(day: 3, hour: 8, calendar: calendar),
                durationMinutes: 50,
                metric: .strength(exercises: 5, sets: 18)
            ),
            WorkoutSession(
                id: "cardio",
                title: "Cardio",
                completedAt: date(day: 4, hour: 8, calendar: calendar),
                durationMinutes: 30,
                metric: .cardio(distanceKilometers: 5.5)
            ),
            WorkoutSession(
                id: "previous-week",
                title: "Previous Week",
                completedAt: date(day: 2, hour: 8, calendar: calendar),
                durationMinutes: 90,
                metric: .strength(exercises: 8, sets: 30)
            )
        ]

        let summary = WorkoutAnalytics.weeklySummary(
            for: sessions,
            referenceDate: referenceDate,
            calendar: calendar
        )

        #expect(summary.sessionCount == 2)
        #expect(summary.totalMinutes == 80)
        #expect(summary.strengthSessionCount == 1)
        #expect(summary.totalSets == 18)
        #expect(summary.cardioSessionCount == 1)
        #expect(summary.totalDistanceKilometers == 5.5)
    }

    private func testCalendar() -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .gmt
        calendar.firstWeekday = 2
        return calendar
    }

    private func date(day: Int, hour: Int, calendar: Calendar) -> Date {
        calendar.date(from: DateComponents(year: 2026, month: 8, day: day, hour: hour)) ?? .distantPast
    }

    private func session(id: String, date: Date) -> WorkoutSession {
        WorkoutSession(
            id: id,
            title: id.capitalized,
            completedAt: date,
            durationMinutes: 30,
            metric: .cardio(distanceKilometers: 5)
        )
    }
}
