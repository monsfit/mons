import Foundation

enum CalorieTimelineBuilder {
    static let hours = Array(0..<24)

    static func items(
        for day: CalorieDayData,
        referenceDate: Date,
        calendar: Calendar
    ) -> [CalorieTimelineItem] {
        let sortedMeals = day.meals.sorted { $0.loggedAt < $1.loggedAt }
        var items = sortedMeals.map(CalorieTimelineItem.meal)

        guard calendar.isDate(day.date, inSameDayAs: referenceDate), !items.isEmpty else {
            return items
        }

        let insertionIndex = sortedMeals.firstIndex { $0.loggedAt > referenceDate } ?? items.endIndex
        items.insert(.currentTime(referenceDate), at: insertionIndex)
        return items
    }
}
