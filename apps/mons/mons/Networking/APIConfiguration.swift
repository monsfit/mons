import Foundation

struct APIConfiguration: Sendable {
    let baseURL: URL

    static var bundled: APIConfiguration {
        let environmentURL = normalized(
            ProcessInfo.processInfo.environment["REGOLITH_API_BASE_URL"]
        )
        let bundledURL = normalized(
            Bundle.main.object(forInfoDictionaryKey: "REGOLITH_API_BASE_URL") as? String
        )
        let value = environmentURL ?? bundledURL ?? defaultBaseURL
        guard let url = URL(string: value) else {
            preconditionFailure("REGOLITH_API_BASE_URL must be a valid URL")
        }
        return APIConfiguration(baseURL: url)
    }

    private static var defaultBaseURL: String {
        #if DEBUG
        "http://127.0.0.1:3000"
        #else
        preconditionFailure("A production REGOLITH_API_BASE_URL must be configured")
        #endif
    }

    private static func normalized(_ value: String?) -> String? {
        guard let value else { return nil }
        let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return normalized.isEmpty ? nil : normalized
    }
}
