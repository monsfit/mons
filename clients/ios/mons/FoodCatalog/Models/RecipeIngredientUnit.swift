import Foundation

nonisolated enum RecipeIngredientUnit: String, Codable, CaseIterable, Sendable {
    case can
    case clove
    case cup
    case gram = "g"
    case kilogram = "kg"
    case liter = "l"
    case milliliter = "ml"
    case ounce = "oz"
    case piece
    case pinch
    case pound = "lb"
    case tablespoon = "tbsp"
    case teaspoon = "tsp"

    func label(for quantity: Double) -> String {
        switch self {
        case .can: quantity == 1 ? "can" : "cans"
        case .clove: quantity == 1 ? "clove" : "cloves"
        case .cup: quantity == 1 ? "cup" : "cups"
        case .gram: "g"
        case .kilogram: "kg"
        case .liter: "L"
        case .milliliter: "mL"
        case .ounce: "oz"
        case .piece: quantity == 1 ? "piece" : "pieces"
        case .pinch: quantity == 1 ? "pinch" : "pinches"
        case .pound: "lb"
        case .tablespoon: "tbsp"
        case .teaspoon: "tsp"
        }
    }
}
