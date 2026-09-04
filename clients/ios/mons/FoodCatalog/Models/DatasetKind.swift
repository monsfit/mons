import Foundation

nonisolated enum DatasetKind: String, Codable, Sendable {
    case branded
    case custom
    case raw
    case recipe
    case restaurant

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
        case .restaurant:
            "Restaurant"
        }
    }
}
