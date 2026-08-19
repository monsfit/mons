import Foundation

nonisolated struct ExerciseDefinition: Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let category: String
    let equipment: String
}
