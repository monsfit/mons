import Foundation

nonisolated struct MuscleRegionDefinition: Decodable, Identifiable, Hashable, Sendable {
    let id: String
    let muscle: String
    let group: String
    let body: MuscleMapBody
    let side: MuscleMapSide
    let name: String
    let commands: [[Double]]

    var displayName: String {
        name
            .replacing("Man: ", with: "")
            .replacing("Woman: ", with: "")
    }

    var groupName: String {
        group
            .replacing("-", with: " ")
            .capitalized
    }
}
