import Foundation

nonisolated struct NutrientBasis: Codable, Hashable, Sendable {
    let amount: Double
    let unit: FoodPortionUnit

    static let standardHundredGrams = NutrientBasis(amount: 100, unit: .grams)
}
