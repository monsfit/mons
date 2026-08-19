import Foundation

nonisolated enum ExerciseFrequency: String, CaseIterable, Codable, Identifiable, Sendable {
    case none
    case oneToThree = "one_to_three"
    case fourToSix = "four_to_six"
    case sevenPlus = "seven_plus"

    var id: Self { self }

    var title: String {
        switch self {
        case .none: "0 sessions / week"
        case .oneToThree: "1–3 sessions / week"
        case .fourToSix: "4–6 sessions / week"
        case .sevenPlus: "7+ sessions / week"
        }
    }

    var systemImage: String { "calendar" }

    var factor: Double {
        switch self {
        case .none: 0
        case .oneToThree: 0.1
        case .fourToSix: 0.2
        case .sevenPlus: 0.3
        }
    }
}
