import SwiftUI

struct MuscleSelectionSummary: View {
    let selectedRegion: MuscleRegionDefinition?
    let onClear: () -> Void

    var body: some View {
        Group {
            if let selectedRegion {
                MonsCard {
                    HStack(spacing: MonsSpacing.medium) {
                        Image(systemName: "figure.strengthtraining.traditional")
                            .font(.title2)
                            .foregroundStyle(MonsColor.workoutAccent)
                            .accessibilityHidden(true)

                        VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                            Text(selectedRegion.displayName)
                                .font(.headline)
                            Text(selectedRegion.groupName)
                                .font(.subheadline)
                                .foregroundStyle(MonsColor.textSecondary)
                        }

                        Spacer()

                        Button("Clear", systemImage: "xmark.circle.fill", action: onClear)
                            .labelStyle(.iconOnly)
                            .foregroundStyle(MonsColor.textSecondary)
                    }
                }
            } else {
                Text("Select a muscle region to inspect it.")
                    .font(.subheadline)
                    .foregroundStyle(MonsColor.textSecondary)
            }
        }
        .frame(maxWidth: 420)
    }
}
