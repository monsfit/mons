import Foundation

struct APIConfiguration: Sendable {
    let baseURL: URL

    static var bundled: APIConfiguration {
        guard
            let value = normalized(apiEnvironment["MONS_API_BASE_URL"] as? String),
            let url = URL(string: value)
        else {
            preconditionFailure("The bundled MONS_API_BASE_URL must be a valid URL")
        }
        return APIConfiguration(baseURL: url)
    }

    private static var apiEnvironment: [String: Any] {
        guard
            let url = Bundle.main.url(forResource: "MonsAPIEnvironment", withExtension: "plist"),
            let data = try? Data(contentsOf: url),
            let value = try? PropertyListSerialization.propertyList(from: data, format: nil),
            let environment = value as? [String: Any]
        else {
            return [:]
        }
        return environment
    }

    private static func normalized(_ value: String?) -> String? {
        guard let value else { return nil }
        let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return normalized.isEmpty ? nil : normalized
    }
}
