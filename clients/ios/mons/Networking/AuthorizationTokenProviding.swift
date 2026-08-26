import Foundation

protocol AuthorizationTokenProviding: Sendable {
    @MainActor func token() async throws -> String?
}
