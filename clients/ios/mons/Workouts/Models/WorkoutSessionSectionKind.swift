import Foundation

enum WorkoutSessionSectionKind: Int, Identifiable, Hashable, Comparable {
    case today
    case thisWeek
    case earlier

    var id: Int { rawValue }

    var title: String {
        switch self {
        case .today:
            "Today"
        case .thisWeek:
            "This Week"
        case .earlier:
            "Earlier"
        }
    }

    static func < (lhs: WorkoutSessionSectionKind, rhs: WorkoutSessionSectionKind) -> Bool {
        lhs.rawValue < rhs.rawValue
    }
}
