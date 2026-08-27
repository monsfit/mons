import Foundation

nonisolated struct FoodLogResponse: Decodable, Sendable {
    let entries: [FoodLogEntry]
}
