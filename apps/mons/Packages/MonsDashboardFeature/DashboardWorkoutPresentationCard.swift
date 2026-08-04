import MonsDesignSystem
import SwiftUI

struct DashboardWorkoutPresentationCard: View {
    let state: DashboardPresentationState
    let onShowWorkouts: () -> Void

    var body: some View {
        MonsCard {
            VStack(alignment: .leading, spacing: MonsSpacing.large) {
                HStack {
                    Label("Workouts", systemImage: "dumbbell.fill").font(MonsTypography.title)
                    Spacer()
                    Button("Open workouts", systemImage: "chevron.right", action: onShowWorkouts)
                        .labelStyle(.iconOnly)
                        .frame(minWidth: 44, minHeight: 44)
                        .buttonStyle(.glass)
                        .buttonBorderShape(.circle)
                }

                HStack {
                    LabeledContent("This week", value: state.weeklyWorkoutCount.formatted())
                    Divider().overlay(MonsColor.border)
                    LabeledContent("Minutes", value: state.weeklyWorkoutMinutes.formatted())
                }
                .font(MonsTypography.headline)

                if let title = state.recentWorkoutTitle {
                    VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                        Text("Most recent")
                            .font(MonsTypography.subheadline)
                            .foregroundStyle(MonsColor.textSecondary)
                        Text(title).font(MonsTypography.headline)
                        if let detail = state.recentWorkoutDetail {
                            Text(detail)
                                .font(MonsTypography.subheadline)
                                .foregroundStyle(MonsColor.textSecondary)
                        }
                    }
                } else {
                    ContentUnavailableView(
                        "No workouts yet",
                        systemImage: "figure.run",
                        description: Text("Your latest session will appear here.")
                    )
                }
            }
        }
    }
}
