import Foundation

nonisolated enum DatasetKind: String, Codable, Sendable {
    case branded
    case custom
    case raw
    case recipe

    var title: String {
        switch self {
        case .branded:
            "Branded"
        case .custom:
            "My Food"
        case .raw:
            "Common"
        case .recipe:
            "Recipe"
        }
    }
}
