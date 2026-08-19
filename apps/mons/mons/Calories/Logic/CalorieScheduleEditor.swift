import Foundation

enum CalorieScheduleEditor {
    static func adding(
        _ meal: MealEvent,
        to day: CalorieDayData,
        calendar: Calendar
    ) -> CalorieDayData? {
        guard calendar.isDate(meal.loggedAt, inSameDayAs: day.date) else { return nil }

        return day.replacingMeals(with: (day.meals + [meal]).sorted { $0.loggedAt < $1.loggedAt })
    }

    static func rescheduling(
        meal identifier: String,
        to destination: Date,
        in day: CalorieDayData,
        calendar: Calendar
    ) -> CalorieDayData? {
        guard
            calendar.isDate(destination, inSameDayAs: day.date),
            let mealIndex = day.meals.firstIndex(where: { $0.id == identifier })
        else {
            return nil
        }

        var meals = day.meals
        meals[mealIndex] = meals[mealIndex].rescheduled(to: destination)
        meals.sort { $0.loggedAt < $1.loggedAt }
        return day.replacingMeals(with: meals)
    }
}
