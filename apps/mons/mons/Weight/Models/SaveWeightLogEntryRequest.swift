import Foundation

nonisolated struct SaveWeightLogEntryRequest: Encodable, Sendable {
    let entryId: UUID
    let measuredAt: Date
    let weightKg: Double
}
