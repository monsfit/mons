import Foundation

nonisolated enum DatasetKind: String, Codable, Sendable {
    case branded
    case raw

    var title: String {
        switch self {
        case .branded:
            "Branded"
        case .raw:
            "Common"
        }
    }
}
