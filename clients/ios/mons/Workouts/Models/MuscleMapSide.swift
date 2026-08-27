import Foundation

nonisolated enum MuscleMapSide: String, CaseIterable, Decodable, Identifiable, Sendable {
    case front
    case back

    var id: Self { self }

    var title: String {
        rawValue.capitalized
    }
}
