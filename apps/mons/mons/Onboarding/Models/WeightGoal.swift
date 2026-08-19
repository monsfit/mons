import Foundation

nonisolated enum WeightGoal: String, CaseIterable, Codable, Identifiable, Sendable {
    case lose
    case maintain
    case gain

    var id: Self { self }

    var title: String {
        switch self {
        case .lose: "Lose Weight"
        case .maintain: "Maintain Weight"
        case .gain: "Gain Weight"
        }
    }

    var detail: String {
        switch self {
        case .lose: "Create a gradual calorie deficit"
        case .maintain: "Stay near your current weight"
        case .gain: "Create a gradual calorie surplus"
        }
    }

    var systemImage: String {
        switch self {
        case .lose: "arrow.down.right"
        case .maintain: "arrow.right"
        case .gain: "arrow.up.right"
        }
    }
}
