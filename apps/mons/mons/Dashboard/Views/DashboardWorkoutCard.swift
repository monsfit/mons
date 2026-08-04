import SwiftUI

struct DashboardWorkoutCard: View {
    let snapshot: DashboardSnapshot
    let onShowWorkouts: () -> Void

    var body: some View {
        MonsCard {
            VStack(alignment: .leading, spacing: MonsSpacing.large) {
                HStack {
                    Label("Workouts", systemImage: "dumbbell.fill")
                        .font(MonsTypography.title)
                        .foregroundStyle(MonsColor.textPrimary)
                    Spacer()
                    Button("Open workouts", systemImage: "chevron.right", action: onShowWorkouts)
                        .labelStyle(.iconOnly)
                        .frame(minWidth: 44, minHeight: 44)
                        .foregroundStyle(MonsColor.textPrimary)
                }

                HStack {
                    LabeledContent("This week", value: "\(snapshot.weeklyWorkoutCount)")
                    Divider().overlay(MonsColor.border)
                    LabeledContent("Minutes", value: "\(snapshot.weeklyWorkoutMinutes)")
                }
                .font(MonsTypography.headline)

                if let workout = snapshot.recentWorkout {
                    VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                        Text("Most recent")
                            .font(MonsTypography.subheadline)
                            .foregroundStyle(MonsColor.textSecondary)
                        Text(workout.title)
                            .font(MonsTypography.headline)
                        Text("\(workout.durationMinutes) min · \(workout.metric.summary)")
                            .font(MonsTypography.subheadline)
                            .foregroundStyle(MonsColor.textSecondary)
                    }
                } else {
                    HStack(spacing: MonsSpacing.medium) {
                        Image(systemName: "figure.run")
                            .font(MonsTypography.title)
                            .foregroundStyle(MonsColor.metric)
                            .frame(width: 44, height: 44)
                            .background(MonsColor.surfaceRaised, in: .rect(cornerRadius: MonsRadius.small))
                            .accessibilityHidden(true)

                        VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                            Text("No workouts yet")
                                .font(MonsTypography.headline)
                            Text("Your latest session will appear here.")
                                .font(MonsTypography.subheadline)
                                .foregroundStyle(MonsColor.textSecondary)
                        }
                    }
                    .accessibilityElement(children: .combine)
                }
            }
        }
    }
}
