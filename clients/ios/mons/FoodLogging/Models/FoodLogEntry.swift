import Foundation

nonisolated struct FoodLogEntry: Codable, Identifiable, Sendable {
    let brand: String?
    let calories: Double?
    let carbohydrates: Double?
    let datasetKind: DatasetKind
    let entryId: UUID
    let fat: Double?
    let foodId: String
    let gtin: String?
    var loggedAt: Date
    let mealId: UUID
    var mealCategory: MealCategory
    let name: String
    let protein: Double?
    let quantityGrams: Double

    var id: UUID { entryId }

    var mealEvent: MealEvent {
        MealEvent(
            id: mealId.uuidString,
            title: name,
            category: mealCategory,
            loggedAt: loggedAt,
            itemCount: 1,
            hasPhoto: false,
            calories: Int((calories ?? 0).rounded()),
            macros: MacroTotals(
                protein: Int((protein ?? 0).rounded()),
                carbohydrates: Int((carbohydrates ?? 0).rounded()),
                fat: Int((fat ?? 0).rounded())
            )
        )
    }
}
