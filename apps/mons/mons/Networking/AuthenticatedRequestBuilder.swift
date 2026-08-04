import Foundation

nonisolated struct AuthenticatedRequestBuilder: Sendable {
    let baseURL: URL

    func request(
        path: [String],
        method: String,
        query: [URLQueryItem] = [],
        body: Data? = nil,
        token: String?
    ) throws -> URLRequest {
        guard let token, !token.isEmpty else {
            throw APIClientError.authenticationRequired
        }

        var url = baseURL
        for component in path {
            url.append(path: component)
        }
        if !query.isEmpty {
            guard var components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
                throw APIClientError.invalidResponse
            }
            components.queryItems = query
            guard let queryURL = components.url else {
                throw APIClientError.invalidResponse
            }
            url = queryURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "accept")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "authorization")
        if body != nil {
            request.setValue("application/json", forHTTPHeaderField: "content-type")
        }
        return request
    }
}
