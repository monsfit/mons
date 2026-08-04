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
    let mealCategory: MealCategory
    let name: String
    let protein: Double?
    let quantityGrams: Double

    var id: UUID { entryId }
}
