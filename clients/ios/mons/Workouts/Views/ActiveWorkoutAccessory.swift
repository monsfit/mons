import SwiftUI

struct ActiveWorkoutAccessory: View {
    let isExpanded: Bool
    let workout: ActiveWorkoutDraft
    let onOpen: () -> Void

    var body: some View {
        Button(action: onOpen) {
            HStack(spacing: MonsSpacing.medium) {
                Image(systemName: "figure.strengthtraining.traditional")
                    .font(MonsTypography.headline)
                    .foregroundStyle(MonsColor.textPrimary)
                    .frame(width: 36, height: 36)
                    .accessibilityHidden(true)

                if isExpanded {
                    VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                        Text(workout.title)
                            .font(MonsTypography.headline)
                            .lineLimit(1)

                        Text("Workout in progress")
                            .font(MonsTypography.caption)
                            .foregroundStyle(MonsColor.textSecondary)
                    }
                }

                Spacer(minLength: MonsSpacing.small)

                WorkoutElapsedTimeLabel(startedAt: workout.startedAt)

                Image(systemName: "chevron.up")
                    .font(MonsTypography.caption)
                    .foregroundStyle(MonsColor.textSecondary)
                    .accessibilityHidden(true)
            }
            .padding(.horizontal, MonsSpacing.medium)
            .frame(minHeight: 56)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Open \(workout.title)")
        .accessibilityHint("Returns to the active workout")
    }
}

#Preview("Active workout accessory") {
    ActiveWorkoutAccessory(
        isExpanded: true,
        workout: ActiveWorkoutDraft(
            exercises: [],
            sessionId: UUID(),
            startedAt: .now.addingTimeInterval(-754),
            templateId: UUID(),
            title: "Summit Push"
        ),
        onOpen: {}
    )
    .padding()
    .background(MonsColor.background)
}
