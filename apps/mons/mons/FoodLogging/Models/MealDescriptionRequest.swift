import Foundation

nonisolated struct MealDescriptionRequest: Encodable, Sendable {
    struct Item: Encodable, Sendable {
        let name: String
        let quantityGrams: Double
    }

    let items: [Item]

    init(items: [PendingFoodLogItem]) {
        self.items = items.map { Item(name: $0.food.name, quantityGrams: $0.quantityGrams) }
    }
}
