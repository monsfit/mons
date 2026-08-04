import Foundation

nonisolated struct PendingFoodLogItem: Identifiable, Sendable {
    let entryId: UUID
    let food: CatalogFood
    let loggedAt: Date
    let quantityGrams: Double

    var id: UUID { entryId }

    var mealCategory: MealCategory {
        MealCategory.inferred(from: loggedAt)
    }
}
