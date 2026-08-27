import Foundation

nonisolated struct APIErrorPayload: Decodable, Sendable {
    let code: String
    let message: String
}
