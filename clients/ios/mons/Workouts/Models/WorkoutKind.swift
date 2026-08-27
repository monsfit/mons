import Foundation

nonisolated enum WorkoutKind: String, CaseIterable, Codable, Hashable, Identifiable, Sendable {
    case strength
    case cardio

    var id: Self { self }

    var title: String {
        rawValue.capitalized
    }

    var systemImage: String {
        switch self {
        case .strength:
            "dumbbell.fill"
        case .cardio:
            "figure.run"
        }
    }
}
