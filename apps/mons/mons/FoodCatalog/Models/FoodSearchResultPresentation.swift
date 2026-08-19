import Foundation

nonisolated struct FoodSearchResultPresentation: Equatable, Sendable {
    let nutritionSummary: String
    let sourceAndServingSummary: String
    let sourceIcon: String

    init(food: CatalogFood) {
        let defaultPortion = food.gramPortions.first
        let quantityGrams = defaultPortion?.amount ?? 100
        let calories = food.scaled(food.calories, quantityGrams: quantityGrams)
        let protein = food.scaled(food.protein, quantityGrams: quantityGrams)
        let fat = food.scaled(food.totalFat, quantityGrams: quantityGrams)
        let carbohydrates = food.scaled(food.carbohydrates, quantityGrams: quantityGrams)

        nutritionSummary = "\(Self.whole(calories)) cal · \(Self.whole(protein)) P · \(Self.whole(fat)) F · \(Self.whole(carbohydrates)) C"
        sourceAndServingSummary = [Self.sourceName(food), Self.servingName(defaultPortion)]
            .compactMap { $0 }
            .joined(separator: " · ")
        sourceIcon = food.datasetKind == .raw ? "fork.knife" : "shippingbox"
    }

    private static func sourceName(_ food: CatalogFood) -> String {
        guard let brand = food.brand?.trimmingCharacters(in: .whitespacesAndNewlines),
              !brand.isEmpty
        else {
            return food.datasetKind == .raw ? "Common food" : "Branded food"
        }
        return brand
    }

    private static func servingName(_ portion: FoodPortion?) -> String {
        guard let portion else { return "Per 100 g" }
        let amount = portion.amount.formatted(.number.precision(.fractionLength(0...1)))
        return "\(portion.name) · \(amount) \(portion.unit.rawValue)"
    }

    private static func whole(_ value: Double) -> String {
        String(Int(value.rounded()))
    }
}
