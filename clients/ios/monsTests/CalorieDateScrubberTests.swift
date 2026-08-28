import Foundation
import Testing
@testable import mons

struct CalorieDateScrubberTests {
    @Test func convertsHorizontalTranslationIntoStableDayOffsets() {
        #expect(CalorieDateScrubber.dayOffset(for: 39) == 0)
        #expect(CalorieDateScrubber.dayOffset(for: 40) == -1)
        #expect(CalorieDateScrubber.dayOffset(for: 121) == -3)
        #expect(CalorieDateScrubber.dayOffset(for: -39) == 0)
        #expect(CalorieDateScrubber.dayOffset(for: -40) == 1)
        #expect(CalorieDateScrubber.dayOffset(for: -121) == 3)
    }

    @Test func clampsScrubbingAtTheMaximumDate() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try #require(TimeZone(secondsFromGMT: 0))
        let origin = try #require(
            calendar.date(from: DateComponents(year: 2026, month: 8, day: 18, hour: 15))
        )
        let maximumDate = try #require(
            calendar.date(from: DateComponents(year: 2026, month: 8, day: 19, hour: 20))
        )

        let futureDate = CalorieDateScrubber.date(
            from: origin,
            dayOffset: 7,
            maximumDate: maximumDate,
            calendar: calendar
        )
        let historicalDate = CalorieDateScrubber.date(
            from: origin,
            dayOffset: -2,
            maximumDate: maximumDate,
            calendar: calendar
        )

        #expect(calendar.isDate(futureDate, inSameDayAs: maximumDate))
        #expect(
            historicalDate == calendar.date(
                from: DateComponents(year: 2026, month: 8, day: 16)
            )
        )
    }
}
