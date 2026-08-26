import Foundation

nonisolated enum RecipeIngredientParser {
    static func parse(
        _ text: String,
        ingredientId: UUID = UUID()
    ) -> FreeformRecipeIngredient? {
        let normalized = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalized.isEmpty else { return nil }

        var tokens = normalized.split(whereSeparator: \.isWhitespace).map(String.init)
        guard let quantity = consumeQuantity(from: &tokens) else {
            return ingredient(
                id: ingredientId,
                name: normalized,
                quantity: nil,
                text: normalized,
                unit: nil
            )
        }

        let unit = consumeUnit(from: &tokens) ?? .piece
        let name = tokens.joined(separator: " ").trimmingCharacters(in: .whitespacesAndNewlines)
        return ingredient(
            id: ingredientId,
            name: name.isEmpty ? normalized : name,
            quantity: quantity,
            text: normalized,
            unit: unit
        )
    }

    private static func ingredient(
        id: UUID,
        name: String,
        quantity: Double?,
        text: String,
        unit: RecipeIngredientUnit?
    ) -> FreeformRecipeIngredient {
        FreeformRecipeIngredient(
            calories: nil,
            carbohydrates: nil,
            ingredientId: id,
            name: name,
            protein: nil,
            quantity: quantity,
            text: text,
            totalFat: nil,
            unit: unit
        )
    }

    private static func consumeQuantity(from tokens: inout [String]) -> Double? {
        guard let first = tokens.first else { return nil }

        if let whole = Double(first) {
            tokens.removeFirst()
            if let fractionToken = tokens.first, let fraction = fractionValue(fractionToken) {
                tokens.removeFirst()
                return whole + fraction
            }
            return whole
        }

        guard let fraction = fractionValue(first) else { return nil }
        tokens.removeFirst()
        return fraction
    }

    private static func fractionValue(_ token: String) -> Double? {
        let unicodeFractions: [Character: Double] = [
            "¼": 0.25,
            "½": 0.5,
            "¾": 0.75,
            "⅓": 1.0 / 3.0,
            "⅔": 2.0 / 3.0,
            "⅛": 0.125,
            "⅜": 0.375,
            "⅝": 0.625,
            "⅞": 0.875,
        ]
        if token.count == 1, let character = token.first, let value = unicodeFractions[character] {
            return value
        }

        let parts = token.split(separator: "/")
        guard parts.count == 2,
              let numerator = Double(parts[0]),
              let denominator = Double(parts[1]),
              denominator != 0 else { return nil }
        return numerator / denominator
    }

    private static func consumeUnit(from tokens: inout [String]) -> RecipeIngredientUnit? {
        guard let token = tokens.first else { return nil }
        let normalized = token
            .lowercased()
            .trimmingCharacters(in: CharacterSet(charactersIn: ".,"))
        guard let unit = unitAliases[normalized] else { return nil }
        tokens.removeFirst()
        return unit
    }

    private static let unitAliases: [String: RecipeIngredientUnit] = [
        "tsp": .teaspoon,
        "teaspoon": .teaspoon,
        "teaspoons": .teaspoon,
        "tbsp": .tablespoon,
        "tablespoon": .tablespoon,
        "tablespoons": .tablespoon,
        "cup": .cup,
        "cups": .cup,
        "g": .gram,
        "gram": .gram,
        "grams": .gram,
        "kg": .kilogram,
        "kilogram": .kilogram,
        "kilograms": .kilogram,
        "ml": .milliliter,
        "milliliter": .milliliter,
        "milliliters": .milliliter,
        "l": .liter,
        "liter": .liter,
        "liters": .liter,
        "oz": .ounce,
        "ounce": .ounce,
        "ounces": .ounce,
        "lb": .pound,
        "lbs": .pound,
        "pound": .pound,
        "pounds": .pound,
        "pinch": .pinch,
        "pinches": .pinch,
        "clove": .clove,
        "cloves": .clove,
        "piece": .piece,
        "pieces": .piece,
        "can": .can,
        "cans": .can,
    ]
}
