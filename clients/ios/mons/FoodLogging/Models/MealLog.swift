import Foundation

nonisolated struct MealLog: Codable, Identifiable, Sendable {
    let calories: Double
    let carbohydrates: Double
    var description: String
    let estimateId: UUID?
    let inputKind: MealEstimateInputKind?
    var items: [FoodLogEntry]
    var loggedAt: Date
    var mealCategory: MealCategory
    let mealId: UUID
    let photoAvailable: Bool
    let protein: Double
    let totalFat: Double

    var id: UUID { mealId }

    var mealEvent: MealEvent {
        MealEvent(
            id: mealId.uuidString,
            title: description,
            category: mealCategory,
            loggedAt: loggedAt,
            itemCount: items.count,
            hasPhoto: photoAvailable,
            calories: Int(calories.rounded()),
            macros: MacroTotals(
                protein: Int(protein.rounded()),
                carbohydrates: Int(carbohydrates.rounded()),
                fat: Int(totalFat.rounded())
            )
        )
    }
}
