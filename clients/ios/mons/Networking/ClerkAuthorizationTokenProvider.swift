import ClerkKit
import Foundation

struct ClerkAuthorizationTokenProvider: AuthorizationTokenProviding {
    @MainActor
    func token() async throws -> String? {
        try await Clerk.shared.auth.getToken()
    }
}
