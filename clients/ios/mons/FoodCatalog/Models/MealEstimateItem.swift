import Foundation

nonisolated struct MealEstimateItem: Codable, Hashable, Identifiable, Sendable {
    let amountGrams: Double
    let calories: Double
    let carbohydrates: Double
    let confidence: Double
    let description: String
    let evidence: String
    let foodId: String?
    let name: String
    let ordinal: Int
    let protein: Double
    let resolved: Bool
    let sourceKind: DatasetKind?
    let totalFat: Double

    var id: Int { ordinal }

    var catalogFood: CatalogFood? {
        guard resolved,
              let foodId,
              let sourceKind,
              amountGrams > 0 else { return nil }

        let scale = 100 / amountGrams
        return CatalogFood(
            brand: nil,
            calories: calories * scale,
            carbohydrates: carbohydrates * scale,
            datasetKind: sourceKind,
            foodId: foodId,
            gtin: nil,
            name: name,
            nutrients: [],
            portions: [.standardHundredGrams],
            protein: protein * scale,
            source: "meal-estimate",
            sourceId: foodId,
            totalFat: totalFat * scale
        )
    }

    func pendingLogItem(loggedAt: Date) -> PendingFoodLogItem? {
        guard let food = catalogFood else { return nil }
        return PendingFoodLogItem(
            entryId: UUID(),
            food: food,
            loggedAt: loggedAt,
            quantityGrams: amountGrams
        )
    }
}
