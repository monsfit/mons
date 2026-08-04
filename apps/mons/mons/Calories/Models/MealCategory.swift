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

    static func inferred(from date: Date, calendar: Calendar = .current) -> Self {
        switch calendar.component(.hour, from: date) {
        case 5..<11:
            .breakfast
        case 11..<15:
            .lunch
        case 17..<22:
            .dinner
        default:
            .snack
        }
    }
}
