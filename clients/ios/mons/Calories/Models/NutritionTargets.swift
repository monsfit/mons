import Foundation

struct NutritionTargets: Equatable {
    let calories: Int
    let protein: Int
    let carbohydrates: Int
    let fat: Int

    init(calorieGoal: Int) {
        calories = max(calorieGoal, 0)
        protein = Int((Double(calories) * 0.25 / 4).rounded())
        carbohydrates = Int((Double(calories) * 0.45 / 4).rounded())
        fat = Int((Double(calories) * 0.30 / 9).rounded())
    }
}
