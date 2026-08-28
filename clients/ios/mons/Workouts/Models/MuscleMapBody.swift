import Foundation

nonisolated enum MuscleMapBody: String, CaseIterable, Decodable, Identifiable, Sendable {
    case male
    case female

    var id: Self { self }

    var title: String {
        switch self {
        case .male:
            "Man"
        case .female:
            "Woman"
        }
    }
}
