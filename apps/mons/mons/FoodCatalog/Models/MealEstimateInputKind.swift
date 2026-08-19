import Foundation

nonisolated enum MealEstimateInputKind: String, Codable, Sendable {
    case photo
    case text
    case voice
}
