import Foundation

nonisolated struct FoodPortion: Codable, Hashable, Identifiable, Sendable {
    let amount: Double
    let name: String
    let unit: FoodPortionUnit

    var id: String {
        "\(name)|\(amount)|\(unit)"
    }

    var gramAmount: Double? {
        unit == .grams ? amount : nil
    }

    var menuTitle: String {
        "\(name) · \(amount.formatted(.number.precision(.fractionLength(0...1)))) \(unit.rawValue)"
    }
}
