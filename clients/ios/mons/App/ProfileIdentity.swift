import Foundation

enum ProfileIdentity {
    private static let key = "mons.profile-id"
    private static let legacyKey = "regolith.profile-id"

    static func current(defaults: UserDefaults = .standard) -> UUID {
        if let value = defaults.string(forKey: key), let identifier = UUID(uuidString: value) {
            return identifier
        }
        if let value = defaults.string(forKey: legacyKey), let identifier = UUID(uuidString: value) {
            defaults.set(identifier.uuidString, forKey: key)
            defaults.removeObject(forKey: legacyKey)
            return identifier
        }
        let identifier = UUID()
        defaults.set(identifier.uuidString, forKey: key)
        return identifier
    }
}
