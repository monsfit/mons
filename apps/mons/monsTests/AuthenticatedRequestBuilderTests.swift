import Foundation
import Testing
@testable import mons

struct AuthenticatedRequestBuilderTests {
    private let builder = AuthenticatedRequestBuilder(
        baseURL: URL(string: "https://api.example.test")!
    )

    @Test func addsBearerAuthenticationAndEncodesThePathDeterministically() throws {
        let request = try builder.request(
            path: ["v1", "foods", "search"],
            method: "GET",
            query: [URLQueryItem(name: "q", value: "fried egg")],
            token: "session-token"
        )

        #expect(request.url?.absoluteString == "https://api.example.test/v1/foods/search?q=fried%20egg")
        #expect(request.value(forHTTPHeaderField: "authorization") == "Bearer session-token")
        #expect(request.value(forHTTPHeaderField: "accept") == "application/json")
    }

    @Test func refusesToBuildAnUnauthenticatedRequest() {
        #expect(throws: APIClientError.self) {
            try builder.request(path: ["v1", "profile"], method: "PUT", token: nil)
        }
    }
}
