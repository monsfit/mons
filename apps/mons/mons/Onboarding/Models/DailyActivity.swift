import Foundation

nonisolated enum DailyActivity: String, CaseIterable, Codable, Identifiable, Sendable {
    case mostlySedentary = "mostly_sedentary"
    case moderatelyActive = "moderately_active"
    case veryActive = "very_active"

    var id: Self { self }

    var title: String {
        switch self {
        case .mostlySedentary: "Mostly Sedentary"
        case .moderatelyActive: "Moderately Active"
        case .veryActive: "Very Active"
        }
    }

    var detail: String {
        switch self {
        case .mostlySedentary: "Usually fewer than 5,000 steps a day"
        case .moderatelyActive: "Usually 5,000–10,000 steps a day"
        case .veryActive: "Usually more than 10,000 steps a day"
        }
    }

    var systemImage: String {
        switch self {
        case .mostlySedentary: "chair.lounge"
        case .moderatelyActive: "figure.walk"
        case .veryActive: "figure.run"
        }
    }

    var factor: Double {
        switch self {
        case .mostlySedentary: 1.4
        case .moderatelyActive: 1.55
        case .veryActive: 1.7
        }
    }
}
