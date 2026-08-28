import Foundation

enum CalorieDateScrubber {
    static let pointsPerDay = 40.0

    static func dayOffset(for translation: Double) -> Int {
        let magnitude = Int(abs(translation) / pointsPerDay)
        return translation < 0 ? magnitude : -magnitude
    }

    static func date(
        from origin: Date,
        dayOffset: Int,
        maximumDate: Date,
        calendar: Calendar
    ) -> Date {
        let originDay = calendar.startOfDay(for: origin)
        let maximumDay = calendar.startOfDay(for: maximumDate)
        let proposedDate = calendar.date(
            byAdding: .day,
            value: dayOffset,
            to: originDay
        ) ?? originDay

        return min(proposedDate, maximumDay)
    }
}
