import Foundation

nonisolated struct ProfileResponse: Decodable, Sendable {
    let profileId: UUID
}
