import Foundation
import Testing
@testable import mons

struct MealCategoryTests {
    @Test func infersMealCategoryFromLocalHourDeterministically() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try #require(TimeZone(secondsFromGMT: 0))

        let day = try #require(calendar.date(from: DateComponents(year: 2026, month: 8, day: 4)))
        let categoryAtHour = { hour in
            MealCategory.inferred(
                from: calendar.date(byAdding: .hour, value: hour, to: day) ?? day,
                calendar: calendar
            )
        }

        #expect(categoryAtHour(7) == .breakfast)
        #expect(categoryAtHour(12) == .lunch)
        #expect(categoryAtHour(16) == .snack)
        #expect(categoryAtHour(19) == .dinner)
        #expect(categoryAtHour(1) == .snack)
    }
}
