import Foundation

struct WorkoutTemplate: Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let exerciseIDs: [String]
}
