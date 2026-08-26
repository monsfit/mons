import Foundation

nonisolated enum RecipeNutritionStatus: String, Codable, Sendable {
    case calculated
    case estimatePending = "estimate_pending"
    case mixed
}

nonisolated struct RecipeIngredient: Codable, Hashable, Identifiable, Sendable {
    let calories: Double?
    let carbohydrates: Double?
    let foodId: String
    let ingredientId: UUID
    let name: String
    let protein: Double?
    let quantityGrams: Double
    let sourceKind: DatasetKind
    let totalFat: Double?

    var id: UUID { ingredientId }

    private enum CodingKeys: String, CodingKey {
        case calories
        case carbohydrates
        case foodId
        case ingredientId
        case name
        case protein
        case quantityGrams
        case sourceKind
        case totalFat
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeNullable(calories, forKey: .calories)
        try container.encodeNullable(carbohydrates, forKey: .carbohydrates)
        try container.encode(foodId, forKey: .foodId)
        try container.encode(ingredientId, forKey: .ingredientId)
        try container.encode(name, forKey: .name)
        try container.encodeNullable(protein, forKey: .protein)
        try container.encode(quantityGrams, forKey: .quantityGrams)
        try container.encode(sourceKind, forKey: .sourceKind)
        try container.encodeNullable(totalFat, forKey: .totalFat)
    }
}

nonisolated struct FreeformRecipeIngredient: Codable, Hashable, Identifiable, Sendable {
    let calories: Double?
    let carbohydrates: Double?
    let ingredientId: UUID
    let name: String?
    let protein: Double?
    let quantity: Double?
    let text: String
    let totalFat: Double?
    let unit: RecipeIngredientUnit?

    var id: UUID { ingredientId }

    private enum CodingKeys: String, CodingKey {
        case calories
        case carbohydrates
        case ingredientId
        case name
        case protein
        case quantity
        case text
        case totalFat
        case unit
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeNullable(calories, forKey: .calories)
        try container.encodeNullable(carbohydrates, forKey: .carbohydrates)
        try container.encode(ingredientId, forKey: .ingredientId)
        try container.encodeNullable(name, forKey: .name)
        try container.encodeNullable(protein, forKey: .protein)
        try container.encodeNullable(quantity, forKey: .quantity)
        try container.encode(text, forKey: .text)
        try container.encodeNullable(totalFat, forKey: .totalFat)
        try container.encodeNullable(unit, forKey: .unit)
    }

    func scaledDescription(multiplier: Double) -> String {
        guard let quantity, let unit, let name else { return text }
        let scaledQuantity = max(quantity * multiplier, 0)
        let amount = scaledQuantity.formatted(.number.precision(.fractionLength(0...2)))
        if unit == .piece {
            return "\(amount) \(name)"
        }
        return "\(amount) \(unit.label(for: scaledQuantity)) \(name)"
    }
}

nonisolated struct Recipe: Codable, Hashable, Identifiable, Sendable {
    let calories: Double?
    let carbohydrates: Double?
    let freeformIngredients: [FreeformRecipeIngredient]
    let imageDataBase64: Data?
    let ingredients: [RecipeIngredient]
    let name: String
    let notes: String
    let nutritionStatus: RecipeNutritionStatus
    let protein: Double?
    let recipeId: UUID
    let servings: Double?
    let sourceKind: DatasetKind
    let totalFat: Double?
    let totalYieldGrams: Double

    var id: UUID { recipeId }

    var catalogFood: CatalogFood {
        var portions = [FoodPortion(amount: totalYieldGrams, name: "Whole recipe", unit: .grams)]
        if let servings, servings > 0 {
            portions.insert(
                FoodPortion(
                    amount: totalYieldGrams / servings,
                    name: "1 serving",
                    unit: .grams
                ),
                at: 0
            )
        }
        return CatalogFood(
            brand: nil,
            calories: calories,
            carbohydrates: carbohydrates,
            datasetKind: .recipe,
            foodId: recipeId.uuidString,
            gtin: nil,
            name: name,
            nutrients: [],
            portions: portions,
            protein: protein,
            source: "user",
            sourceId: recipeId.uuidString,
            totalFat: totalFat
        )
    }
}

nonisolated struct RecipeResponse: Decodable, Sendable {
    let recipes: [Recipe]
}

nonisolated struct SaveRecipeRequest: Encodable, Sendable {
    let freeformIngredients: [FreeformRecipeIngredient]
    let imageDataBase64: Data?
    let ingredients: [RecipeIngredient]
    let name: String
    let notes: String
    let recipeId: UUID
    let servings: Double?
    let totalYieldGrams: Double

    private enum CodingKeys: String, CodingKey {
        case freeformIngredients
        case imageDataBase64
        case ingredients
        case name
        case notes
        case recipeId
        case servings
        case totalYieldGrams
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(freeformIngredients, forKey: .freeformIngredients)
        try container.encodeNullable(imageDataBase64, forKey: .imageDataBase64)
        try container.encode(ingredients, forKey: .ingredients)
        try container.encode(name, forKey: .name)
        try container.encode(notes, forKey: .notes)
        try container.encode(recipeId, forKey: .recipeId)
        try container.encodeNullable(servings, forKey: .servings)
        try container.encode(totalYieldGrams, forKey: .totalYieldGrams)
    }
}

private extension KeyedEncodingContainer {
    nonisolated mutating func encodeNullable<T: Encodable>(_ value: T?, forKey key: Key) throws {
        if let value {
            try encode(value, forKey: key)
        } else {
            try encodeNil(forKey: key)
        }
    }
}
