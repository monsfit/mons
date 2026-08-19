import Foundation

nonisolated struct MealReviewDraft: Identifiable, Sendable {
    let estimateId: UUID?
    let inputKind: MealEstimateInputKind?
    var description: String
    var items: [PendingFoodLogItem]
    var loggedAt: Date
    var mealCategory: MealCategory
    let mealId: UUID
    var photoData: Data?
    let transcript: String?
    var unresolvedItems: [String]

    var id: UUID { mealId }

    init(estimate: MealEstimate, loggedAt: Date, photoData: Data? = nil) {
        estimateId = estimate.estimateId
        inputKind = estimate.inputKind
        description = estimate.description
        items = estimate.items.compactMap { $0.pendingLogItem(loggedAt: loggedAt) }
        self.loggedAt = loggedAt
        mealCategory = MealCategory.inferred(from: loggedAt)
        mealId = UUID()
        self.photoData = photoData
        transcript = estimate.transcript
        unresolvedItems = estimate.unresolvedItems
    }

    init(meal: MealLog, photoData: Data? = nil) {
        estimateId = meal.estimateId
        inputKind = meal.inputKind
        description = meal.description
        items = meal.items.map { entry in
            PendingFoodLogItem(
                entryId: entry.entryId,
                food: RecentFoodBuilder.catalogFood(from: entry),
                loggedAt: meal.loggedAt,
                mealCategory: meal.mealCategory,
                quantityGrams: entry.quantityGrams
            )
        }
        loggedAt = meal.loggedAt
        mealCategory = meal.mealCategory
        mealId = meal.mealId
        self.photoData = photoData
        transcript = nil
        unresolvedItems = []
    }

    init(items: [PendingFoodLogItem], description: String) {
        estimateId = nil
        inputKind = nil
        self.description = description
        self.items = items
        let date = items.first?.loggedAt ?? .now
        loggedAt = date
        mealCategory = items.first?.mealCategory ?? MealCategory.inferred(from: date)
        mealId = UUID()
        photoData = nil
        transcript = nil
        unresolvedItems = []
    }

    var calories: Double { nutrition(\.calories) }
    var carbohydrates: Double { nutrition(\.carbohydrates) }
    var protein: Double { nutrition(\.protein) }
    var totalFat: Double { nutrition(\.totalFat) }

    private func nutrition(_ keyPath: KeyPath<CatalogFood, Double?>) -> Double {
        items.reduce(0) { total, item in
            total + (item.food[keyPath: keyPath] ?? 0) * item.quantityGrams / 100
        }
    }
}
