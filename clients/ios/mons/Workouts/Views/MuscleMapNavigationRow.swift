import SwiftUI

struct MuscleMapNavigationRow: View {
    var body: some View {
        Label {
            VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                Text("Muscle Map")
                    .foregroundStyle(MonsColor.textPrimary)
                Text("Explore selectable front and back muscle regions")
                    .font(.subheadline)
                    .foregroundStyle(MonsColor.textSecondary)
            }
        } icon: {
            Image(systemName: "figure.strengthtraining.traditional")
                .foregroundStyle(MonsColor.workoutAccent)
        }
    }
}
