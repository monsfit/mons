import Foundation

nonisolated struct CustomFood: Codable, Hashable, Identifiable, Sendable {
    let barcode: String?
    let brand: String?
    let calories: Double?
    let carbohydrates: Double?
    let foodId: UUID
    let imageDataBase64: Data?
    let name: String
    let nutritionLabelImageDataBase64: Data?
    let portions: [FoodPortion]
    let protein: Double?
    let sourceKind: DatasetKind
    let totalFat: Double?

    var id: UUID { foodId }

    var catalogFood: CatalogFood {
        CatalogFood(
            brand: brand,
            calories: calories,
            carbohydrates: carbohydrates,
            datasetKind: .custom,
            foodId: foodId.uuidString,
            gtin: barcode,
            name: name,
            nutrients: [],
            portions: portions,
            protein: protein,
            source: "user",
            sourceId: foodId.uuidString,
            totalFat: totalFat
        )
    }
}

nonisolated struct CustomFoodResponse: Decodable, Sendable {
    let foods: [CustomFood]
}

nonisolated struct SaveCustomFoodRequest: Encodable, Sendable {
    let barcode: String?
    let brand: String?
    let calories: Double?
    let carbohydrates: Double?
    let foodId: UUID
    let imageDataBase64: Data?
    let name: String
    let nutritionLabelImageDataBase64: Data?
    let portions: [FoodPortion]
    let protein: Double?
    let totalFat: Double?
}
