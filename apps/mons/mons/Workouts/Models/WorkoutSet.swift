import Foundation

nonisolated struct WorkoutSet: Identifiable, Hashable, Sendable {
    let id: String
    let title: String
    let detail: String
    let value: String
}
