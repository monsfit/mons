import Foundation

enum APIClientError: LocalizedError, Sendable {
    case authenticationRequired
    case invalidResponse
    case rejected(status: Int, message: String)

    var errorDescription: String? {
        switch self {
        case .authenticationRequired:
            "Please sign in to continue."
        case .invalidResponse:
            "The server returned an invalid response."
        case .rejected(_, let message):
            message
        }
    }
}
