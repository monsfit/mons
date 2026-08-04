import Foundation

nonisolated struct CatalogFood: Codable, Hashable, Identifiable, Sendable {
    let brand: String?
    let calories: Double?
    let carbohydrates: Double?
    let datasetKind: DatasetKind
    let foodId: String
    let gtin: String?
    let name: String
    let portions: [FoodPortion]
    let protein: Double?
    let source: String
    let sourceId: String
    let totalFat: Double?

    var id: String { "\(datasetKind.rawValue)-\(foodId)" }

    var gramPortions: [FoodPortion] {
        portions.filter { $0.gramAmount != nil }
    }

    func quantityGrams(amount: Double, portion: FoodPortion?) -> Double {
        max(amount, 0) * (portion?.gramAmount ?? 1)
    }

    func scaled(_ nutrient: Double?, quantityGrams: Double) -> Double {
        guard let nutrient else { return 0 }
        return nutrient * max(quantityGrams, 0) / 100
    }
}
