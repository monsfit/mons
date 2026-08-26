import Foundation

nonisolated struct RemoteWorkoutSet: Codable, Identifiable, Sendable {
    let detail: String
    let setId: UUID
    let title: String
    let value: String

    var id: UUID { setId }
}
