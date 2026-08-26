import Foundation

nonisolated struct MealEstimate: Codable, Identifiable, Sendable {
    let calories: Double
    let carbohydrates: Double
    let createdAt: Date
    let description: String
    let estimateId: UUID
    let inputKind: MealEstimateInputKind
    let items: [MealEstimateItem]
    let mediaRetained: Bool
    let overallConfidence: Double
    let protein: Double
    let status: MealEstimateStatus
    let totalFat: Double
    let transcript: String?
    let unresolvedItems: [String]

    var id: UUID { estimateId }
}
