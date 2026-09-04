import Foundation

nonisolated struct FoodSearchResult: Decodable, Sendable {
    let brand: String?
    let calories: Double?
    let carbohydrates: Double?
    let datasetKind: DatasetKind
    let defaultPortion: FoodPortion?
    let foodId: String
    let name: String
    let nutrientBasis: NutrientBasis
    let protein: Double?
    let totalFat: Double?

    var catalogFood: CatalogFood {
        CatalogFood(
            brand: brand,
            calories: calories,
            carbohydrates: carbohydrates,
            datasetKind: datasetKind,
            foodId: foodId,
            gtin: nil,
            name: name,
            nutrientBasis: nutrientBasis,
            nutrients: [],
            portions: defaultPortion.map { [$0] } ?? [],
            protein: protein,
            source: datasetKind.rawValue,
            sourceId: foodId,
            totalFat: totalFat
        )
    }
}
