import Foundation

nonisolated struct MuscleMapPayload: Decodable, Sendable {
    let version: Int
    let regions: [MuscleRegionDefinition]
}
