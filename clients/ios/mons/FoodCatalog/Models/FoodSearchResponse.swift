import Foundation

nonisolated struct FoodSearchResponse: Decodable, Sendable {
    let catalogReleaseId: String
    let foods: [FoodSearchResult]
}
