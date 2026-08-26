import Foundation

nonisolated struct WeightLogEntry: Codable, Comparable, Identifiable, Sendable {
    let entryId: UUID
    let measuredAt: Date
    let weightKg: Double

    var id: UUID { entryId }

    static func < (lhs: WeightLogEntry, rhs: WeightLogEntry) -> Bool {
        if lhs.measuredAt == rhs.measuredAt {
            lhs.entryId.uuidString < rhs.entryId.uuidString
        } else {
            lhs.measuredAt < rhs.measuredAt
        }
    }
}
