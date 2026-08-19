import Foundation

nonisolated struct PendingFoodLogItem: Identifiable, Sendable {
    let entryId: UUID
    let food: CatalogFood
    let loggedAt: Date
    let mealCategory: MealCategory
    let quantityGrams: Double

    var id: UUID { entryId }

    init(
        entryId: UUID,
        food: CatalogFood,
        loggedAt: Date,
        mealCategory: MealCategory? = nil,
        quantityGrams: Double
    ) {
        self.entryId = entryId
        self.food = food
        self.loggedAt = loggedAt
        self.mealCategory = mealCategory ?? MealCategory.inferred(from: loggedAt)
        self.quantityGrams = quantityGrams
    }
}
