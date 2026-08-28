import SwiftUI

struct MuscleMapView: View {
    @State private var model = MuscleMapModel()
    @State private var bodyType = MuscleMapBody.male
    @State private var side = MuscleMapSide.front

    var body: some View {
        ScrollView {
            VStack(spacing: MonsSpacing.xLarge) {
                MuscleMapControls(bodyType: $bodyType, side: $side)

                if let errorMessage = model.errorMessage {
                    ContentUnavailableView(
                        "Muscle Map Unavailable",
                        systemImage: "figure.strengthtraining.traditional",
                        description: Text(errorMessage)
                    )
                } else if model.regions.isEmpty {
                    ProgressView("Loading muscle map…")
                        .frame(maxWidth: .infinity, minHeight: 320)
                } else {
                    MuscleMapFigureView(
                        regions: model.regions(for: bodyType, side: side),
                        selectedRegion: $model.selectedRegion
                    )
                    .frame(maxWidth: 420)

                    MuscleSelectionSummary(
                        selectedRegion: model.selectedRegion,
                        onClear: model.clearSelection
                    )
                }
            }
            .frame(maxWidth: 680)
            .padding(.horizontal, MonsSpacing.large)
            .padding(.vertical, MonsSpacing.xLarge)
            .frame(maxWidth: .infinity)
        }
        .background(MonsColor.background)
        .foregroundStyle(MonsColor.textPrimary)
        .navigationTitle("Muscle Map")
        .task {
            model.load()
        }
        .onChange(of: bodyType) {
            model.clearSelection()
        }
        .onChange(of: side) {
            model.clearSelection()
        }
    }
}

#Preview("Muscle Map") {
    NavigationStack {
        MuscleMapView()
    }
}
