import Foundation
import Observation

@Observable
@MainActor
final class MuscleMapModel {
    private(set) var regions: [MuscleRegionDefinition] = []
    private(set) var errorMessage: String?
    var selectedRegion: MuscleRegionDefinition?

    private var hasLoaded = false

    func load(bundle: Bundle = .main) {
        guard !hasLoaded else { return }
        hasLoaded = true

        guard let url = bundle.url(forResource: "MonsMuscleMapPaths", withExtension: "json") else {
            errorMessage = "The bundled muscle-map data could not be found."
            return
        }

        do {
            let data = try Data(contentsOf: url)
            let payload = try JSONDecoder().decode(MuscleMapPayload.self, from: data)
            guard payload.version == 1 else {
                errorMessage = "This muscle-map data version is not supported."
                return
            }
            regions = payload.regions
        } catch {
            errorMessage = "The muscle map could not be loaded."
        }
    }

    func regions(for body: MuscleMapBody, side: MuscleMapSide) -> [MuscleRegionDefinition] {
        regions.filter { $0.body == body && $0.side == side }
    }

    func clearSelection() {
        selectedRegion = nil
    }
}
