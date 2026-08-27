import Foundation

struct CalorieDayData: Identifiable, Hashable {
    var id: Date { date }

    let date: Date
    let calorieGoal: Int
    let meals: [MealEvent]

    var consumedCalories: Int {
        meals.reduce(0) { $0 + $1.calories }
    }

    var remainingCalories: Int {
        calorieGoal - consumedCalories
    }

    var macros: MacroTotals {
        meals.reduce(.zero) { $0 + $1.macros }
    }

    static func empty(on date: Date, goal: Int = 2_200) -> CalorieDayData {
        CalorieDayData(date: date, calorieGoal: goal, meals: [])
    }

    func replacingMeals(with meals: [MealEvent]) -> CalorieDayData {
        CalorieDayData(date: date, calorieGoal: calorieGoal, meals: meals)
    }
}
