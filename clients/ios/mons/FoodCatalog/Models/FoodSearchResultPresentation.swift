import Foundation

nonisolated struct FoodSearchResultPresentation: Equatable, Sendable {
    let nutritionSummary: String
    let sourceAndServingSummary: String
    let sourceIcon: String

    init(food: CatalogFood) {
        let defaultPortion = food.portions.first
        let quantityGrams = defaultPortion?.amount ?? food.nutrientBasis.amount
        let calories = food.scaled(food.calories, quantityGrams: quantityGrams)
        let protein = food.scaled(food.protein, quantityGrams: quantityGrams)
        let fat = food.scaled(food.totalFat, quantityGrams: quantityGrams)
        let carbohydrates = food.scaled(food.carbohydrates, quantityGrams: quantityGrams)

        nutritionSummary = "\(Self.whole(calories)) cal · \(Self.whole(protein)) P · \(Self.whole(fat)) F · \(Self.whole(carbohydrates)) C"
        sourceAndServingSummary = [
            Self.sourceName(food),
            Self.servingName(defaultPortion, basis: food.nutrientBasis),
        ]
            .compactMap { $0 }
            .joined(separator: " · ")
        sourceIcon = Self.sourceIcon(food.datasetKind)
    }

    private static func sourceName(_ food: CatalogFood) -> String {
        guard let brand = food.brand?.trimmingCharacters(in: .whitespacesAndNewlines),
              !brand.isEmpty
        else {
            return switch food.datasetKind {
            case .raw: "Common food"
            case .branded: "Branded food"
            case .custom: "My Food"
            case .recipe: "Recipe"
            case .restaurant: "Restaurant food"
            }
        }
        return brand
    }

    private static func sourceIcon(_ datasetKind: DatasetKind) -> String {
        switch datasetKind {
        case .raw: "fork.knife"
        case .branded: "shippingbox"
        case .custom: "square.and.pencil"
        case .recipe: "book.closed"
        case .restaurant: "takeoutbag.and.cup.and.straw"
        }
    }

    private static func servingName(_ portion: FoodPortion?, basis: NutrientBasis) -> String {
        guard let portion else {
            let amount = basis.amount.formatted(.number.precision(.fractionLength(0...1)))
            return "Per \(amount) \(basis.unit.rawValue)"
        }
        let amount = portion.amount.formatted(.number.precision(.fractionLength(0...1)))
        return "\(portion.name) · \(amount) \(portion.unit.rawValue)"
    }

    private static func whole(_ value: Double) -> String {
        String(Int(value.rounded()))
    }
}
