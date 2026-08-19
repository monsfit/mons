import Foundation

nonisolated struct SaveWorkoutSetRequest: Encodable, Sendable {
    let detail: String
    let setId: UUID
    let title: String
    let value: String
}
