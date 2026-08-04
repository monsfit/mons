import Foundation

nonisolated struct FoodSearchResponse: Decodable, Sendable {
    let foods: [CatalogFood]
}
