import Foundation

nonisolated struct SaveWorkoutRequest: Encodable, Sendable {
    let completedAt: Date?
    let distanceKilometers: Double?
    let durationMinutes: Int
    let kind: WorkoutKind
    let sessionId: UUID
    let sets: [SaveWorkoutSetRequest]
    let startedAt: Date
    let title: String

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        if let completedAt {
            try container.encode(completedAt, forKey: .completedAt)
        } else {
            try container.encodeNil(forKey: .completedAt)
        }
        if let distanceKilometers {
            try container.encode(distanceKilometers, forKey: .distanceKilometers)
        } else {
            try container.encodeNil(forKey: .distanceKilometers)
        }
        try container.encode(durationMinutes, forKey: .durationMinutes)
        try container.encode(kind, forKey: .kind)
        try container.encode(sessionId, forKey: .sessionId)
        try container.encode(sets, forKey: .sets)
        try container.encode(startedAt, forKey: .startedAt)
        try container.encode(title, forKey: .title)
    }

    private enum CodingKeys: String, CodingKey {
        case completedAt
        case distanceKilometers
        case durationMinutes
        case kind
        case sessionId
        case sets
        case startedAt
        case title
    }
}
