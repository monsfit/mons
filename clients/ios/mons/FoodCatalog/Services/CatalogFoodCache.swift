import Foundation

actor CatalogFoodCache {
    private struct Entry: Codable, Sendable {
        let cachedAt: Date
        let food: CatalogFood
    }

    private struct Snapshot: Codable, Sendable {
        var activeReleaseId: String?
        var entries: [String: Entry]

        static let empty = Snapshot(activeReleaseId: nil, entries: [:])
    }

    private let fileURL: URL
    private let maximumAge: TimeInterval
    private let maximumEntryCount: Int
    private let now: @Sendable () -> Date

    private var isLoaded = false
    private var snapshot = Snapshot.empty

    init(
        fileURL: URL = CatalogFoodCache.defaultFileURL,
        maximumAge: TimeInterval = 30 * 24 * 60 * 60,
        maximumEntryCount: Int = 500,
        now: @escaping @Sendable () -> Date = Date.init
    ) {
        self.fileURL = fileURL
        self.maximumAge = maximumAge
        self.maximumEntryCount = maximumEntryCount
        self.now = now
    }

    func activate(releaseId: String) {
        loadIfNeeded()
        guard snapshot.activeReleaseId != releaseId else { return }
        snapshot = Snapshot(activeReleaseId: releaseId, entries: [:])
        persist()
    }

    func food(datasetKind: DatasetKind, foodId: String) -> CatalogFood? {
        loadIfNeeded()
        return unexpiredFood(forKey: Self.key(datasetKind: datasetKind, foodId: foodId))
    }

    func food(gtin: String) -> CatalogFood? {
        loadIfNeeded()
        let matchingEntry = snapshot.entries.values.first { $0.food.gtin == gtin }
        guard let matchingEntry else { return nil }
        guard isFresh(matchingEntry) else {
            removeExpiredEntries()
            return nil
        }
        return matchingEntry.food
    }

    func insert(_ food: CatalogFood, releaseId: String) {
        activate(releaseId: releaseId)
        snapshot.entries[Self.key(datasetKind: food.datasetKind, foodId: food.foodId)] = Entry(
            cachedAt: now(),
            food: food
        )
        trimToMaximumEntryCount()
        persist()
    }

    private static var defaultFileURL: URL {
        let root = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first
            ?? URL(filePath: NSTemporaryDirectory(), directoryHint: .isDirectory)
        return root.appending(path: "mons-catalog-foods-v1.json", directoryHint: .notDirectory)
    }

    private static func key(datasetKind: DatasetKind, foodId: String) -> String {
        "\(datasetKind.rawValue):\(foodId)"
    }

    private func loadIfNeeded() {
        guard !isLoaded else { return }
        isLoaded = true
        guard let data = try? Data(contentsOf: fileURL),
              let stored = try? JSONDecoder().decode(Snapshot.self, from: data) else { return }
        snapshot = stored
        removeExpiredEntries()
    }

    private func unexpiredFood(forKey key: String) -> CatalogFood? {
        guard let entry = snapshot.entries[key] else { return nil }
        guard isFresh(entry) else {
            snapshot.entries.removeValue(forKey: key)
            persist()
            return nil
        }
        return entry.food
    }

    private func isFresh(_ entry: Entry) -> Bool {
        now().timeIntervalSince(entry.cachedAt) <= maximumAge
    }

    private func removeExpiredEntries() {
        let previousCount = snapshot.entries.count
        snapshot.entries = snapshot.entries.filter { isFresh($0.value) }
        if snapshot.entries.count != previousCount {
            persist()
        }
    }

    private func trimToMaximumEntryCount() {
        let overflow = snapshot.entries.count - maximumEntryCount
        guard overflow > 0 else { return }
        for key in snapshot.entries
            .sorted(by: { $0.value.cachedAt < $1.value.cachedAt })
            .prefix(overflow)
            .map(\.key) {
            snapshot.entries.removeValue(forKey: key)
        }
    }

    private func persist() {
        guard let data = try? JSONEncoder().encode(snapshot) else { return }
        try? FileManager.default.createDirectory(
            at: fileURL.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )
        try? data.write(to: fileURL, options: .atomic)
    }
}
