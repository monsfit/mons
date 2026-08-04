import Foundation
import Testing
@testable import mons

struct CalorieTimelineBuilderTests {
    @Test func exposesEveryHourInStableOrder() {
        #expect(CalorieTimelineBuilder.hours == Array(0..<24))
    }

    @Test func sortsMealsAndInsertsCurrentTime() throws {
        let calendar = testCalendar()
        let day = try #require(calendar.date(from: DateComponents(year: 2026, month: 8, day: 5)))
        let morning = meal(id: "morning", at: date(day: day, hour: 8, calendar: calendar))
        let afternoon = meal(id: "afternoon", at: date(day: day, hour: 13, calendar: calendar))
        let referenceDate = date(day: day, hour: 12, calendar: calendar)
        let data = CalorieDayData(date: day, calorieGoal: 2_200, meals: [afternoon, morning])

        let items = CalorieTimelineBuilder.items(
            for: data,
            referenceDate: referenceDate,
            calendar: calendar
        )

        #expect(items.map(\.id) == ["meal-morning", "current-time", "meal-afternoon"])
    }

    @Test func omitsCurrentTimeFromHistoricalDays() throws {
        let calendar = testCalendar()
        let day = try #require(calendar.date(from: DateComponents(year: 2026, month: 8, day: 4)))
        let referenceDate = try #require(calendar.date(from: DateComponents(year: 2026, month: 8, day: 5, hour: 12)))
        let data = CalorieDayData(
            date: day,
            calorieGoal: 2_200,
            meals: [meal(id: "breakfast", at: date(day: day, hour: 8, calendar: calendar))]
        )

        let items = CalorieTimelineBuilder.items(
            for: data,
            referenceDate: referenceDate,
            calendar: calendar
        )

        #expect(items.map(\.id) == ["meal-breakfast"])
    }

    @Test func reschedulesMealAndMaintainsChronologicalOrder() throws {
        let calendar = testCalendar()
        let day = try #require(calendar.date(from: DateComponents(year: 2026, month: 8, day: 5)))
        let breakfast = meal(id: "breakfast", at: date(day: day, hour: 8, calendar: calendar))
        let lunch = meal(id: "lunch", at: date(day: day, hour: 12, calendar: calendar))
        let data = CalorieDayData(date: day, calorieGoal: 2_200, meals: [breakfast, lunch])

        let updated = CalorieScheduleEditor.rescheduling(
            meal: "lunch",
            to: date(day: day, hour: 7, calendar: calendar),
            in: data,
            calendar: calendar
        )

        #expect(updated?.meals.map(\.id) == ["lunch", "breakfast"])
        #expect(updated?.meals.first?.loggedAt == date(day: day, hour: 7, calendar: calendar))
    }

    private func testCalendar() -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .gmt
        calendar.firstWeekday = 2
        return calendar
    }

    private func date(day: Date, hour: Int, calendar: Calendar) -> Date {
        calendar.date(bySettingHour: hour, minute: 0, second: 0, of: day) ?? day
    }

    private func meal(id: String, at date: Date) -> MealEvent {
        MealEvent(
            id: id,
            title: id.capitalized,
            category: .breakfast,
            loggedAt: date,
            itemCount: 1,
            calories: 100,
            macros: .zero
        )
    }
}
