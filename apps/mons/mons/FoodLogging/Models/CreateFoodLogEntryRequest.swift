import Foundation

nonisolated struct CreateFoodLogEntryRequest: Encodable, Sendable {
    let datasetKind: DatasetKind
    let entryId: UUID
    let foodId: String
    let loggedAt: Date
    let mealCategory: MealCategory
    let quantityGrams: Double
}
