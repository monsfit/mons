import SwiftUI

struct DashboardWorkoutCard: View {
    let snapshot: DashboardSnapshot
    let onShowWorkouts: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Label("Workouts", systemImage: "figure.run")
                    .font(.title2)
                    .bold()
                Spacer()
                Button("Open workouts", systemImage: "chevron.right", action: onShowWorkouts)
                    .labelStyle(.iconOnly)
                    .frame(minWidth: 44, minHeight: 44)
            }

            HStack {
                LabeledContent("This week", value: "\(snapshot.weeklyWorkoutCount)")
                Divider()
                LabeledContent("Minutes", value: "\(snapshot.weeklyWorkoutMinutes)")
            }
            .font(.headline)

            if let workout = snapshot.recentWorkout {
                VStack(alignment: .leading) {
                    Text("Most recent")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text(workout.title)
                        .font(.headline)
                    Text("\(workout.durationMinutes) min · \(workout.metric.summary)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            } else {
                ContentUnavailableView(
                    "No workouts yet",
                    systemImage: "figure.run",
                    description: Text("Your latest session will appear here.")
                )
            }
        }
        .padding()
        .background(.thinMaterial, in: .rect(cornerRadius: 20))
    }
}
