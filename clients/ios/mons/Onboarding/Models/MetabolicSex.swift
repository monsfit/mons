import Foundation

nonisolated enum MetabolicSex: String, CaseIterable, Codable, Identifiable, Sendable {
    case female
    case male

    var id: Self { self }

    var title: String {
        switch self {
        case .female: "Female equation"
        case .male: "Male equation"
        }
    }

    var detail: String {
        "Used only for the resting-energy calculation"
    }
}
