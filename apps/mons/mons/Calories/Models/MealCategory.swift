import Foundation

nonisolated enum MealCategory: String, CaseIterable, Codable, Hashable, Identifiable, Sendable {
    case breakfast
    case lunch
    case snack
    case dinner

    var id: Self { self }

    var title: String {
        rawValue.capitalized
    }

    var systemImage: String {
        switch self {
        case .breakfast:
            "sunrise.fill"
        case .lunch:
            "sun.max.fill"
        case .snack:
            "leaf.fill"
        case .dinner:
            "moon.stars.fill"
        }
    }
}
