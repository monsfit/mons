import Foundation
import Testing
@testable import mons

@MainActor
struct MuscleMapDataTests {
    @Test func bundledMapContainsEveryUniqueRegion() throws {
        let url = try #require(Bundle.main.url(forResource: "MonsMuscleMapPaths", withExtension: "json"))
        let payload = try JSONDecoder().decode(MuscleMapPayload.self, from: Data(contentsOf: url))

        #expect(payload.version == 1)
        #expect(payload.regions.count == 178)
        #expect(Set(payload.regions.map(\.id)).count == 178)
        #expect(payload.regions.count(where: { $0.body == .male && $0.side == .front }) == 40)
        #expect(payload.regions.count(where: { $0.body == .male && $0.side == .back }) == 49)
        #expect(payload.regions.count(where: { $0.body == .female && $0.side == .front }) == 40)
        #expect(payload.regions.count(where: { $0.body == .female && $0.side == .back }) == 49)
    }

    @Test func bundledPathCommandsAreValidAndNormalized() throws {
        let url = try #require(Bundle.main.url(forResource: "MonsMuscleMapPaths", withExtension: "json"))
        let payload = try JSONDecoder().decode(MuscleMapPayload.self, from: Data(contentsOf: url))

        for region in payload.regions {
            #expect(!region.commands.isEmpty)
            #expect(region.commands.allSatisfy { [0, 1, 2, 3].contains(Int($0[0])) })
            #expect(
                region.commands
                    .flatMap { $0.dropFirst() }
                    .allSatisfy { (-0.01 ... 1.01).contains($0) }
            )
        }
    }
}
