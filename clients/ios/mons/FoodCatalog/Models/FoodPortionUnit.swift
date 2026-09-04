import Foundation

nonisolated enum FoodPortionUnit: String, Codable, Hashable, Sendable {
    case grams = "g"
    case milliliters = "ml"
    case serving
}
