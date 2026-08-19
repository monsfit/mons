import Foundation

nonisolated struct MealLogResponse: Decodable, Sendable {
    let meals: [MealLog]
}
