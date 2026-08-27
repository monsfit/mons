import Foundation

enum ProfileIdentity {
    private static let key = "regolith.profile-id"

    static func current(defaults: UserDefaults = .standard) -> UUID {
        if let value = defaults.string(forKey: key), let identifier = UUID(uuidString: value) {
            return identifier
        }
        let identifier = UUID()
        defaults.set(identifier.uuidString, forKey: key)
        return identifier
    }
}
