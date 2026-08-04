import Foundation

struct APIConfiguration: Sendable {
    let baseURL: URL

    static var bundled: APIConfiguration {
        let environmentURL = ProcessInfo.processInfo.environment["REGOLITH_API_BASE_URL"]
        let bundledURL = Bundle.main.object(forInfoDictionaryKey: "REGOLITH_API_BASE_URL") as? String
        let value = environmentURL ?? bundledURL ?? "http://127.0.0.1:3000"
        guard let url = URL(string: value) else {
            preconditionFailure("REGOLITH_API_BASE_URL must be a valid URL")
        }
        return APIConfiguration(baseURL: url)
    }
}
