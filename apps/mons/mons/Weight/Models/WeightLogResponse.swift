import Foundation

nonisolated struct WeightLogResponse: Decodable, Sendable {
    let entries: [WeightLogEntry]
}
