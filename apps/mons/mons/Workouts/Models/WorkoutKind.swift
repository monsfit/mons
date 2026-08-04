import Foundation

enum WorkoutKind: String, Hashable {
    case strength
    case cardio

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
