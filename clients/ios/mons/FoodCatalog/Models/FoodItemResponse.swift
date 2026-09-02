import Foundation

nonisolated struct FoodItemResponse: Decodable, Sendable {
    let catalogReleaseId: String
    let food: CatalogFood
}
