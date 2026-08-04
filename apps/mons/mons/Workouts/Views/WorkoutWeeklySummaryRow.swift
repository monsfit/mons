import SwiftUI

struct WorkoutWeeklySummaryRow: View {
    let summary: WorkoutWeeklySummary

    var body: some View {
        VStack(alignment: .leading) {
            LabeledContent("Sessions") {
                Text(summary.sessionCount, format: .number)
                    .bold()
            }

            LabeledContent("Total time") {
                Text("\(summary.totalMinutes.formatted()) min")
                    .bold()
            }

            LabeledContent {
                Text("\(summary.totalSets.formatted()) sets")
                    .bold()
            } label: {
                Label("\(summary.strengthSessionCount) strength", systemImage: WorkoutKind.strength.systemImage)
            }

            LabeledContent {
                Text("\(summary.totalDistanceKilometers.formatted(.number.precision(.fractionLength(1)))) km")
                    .bold()
            } label: {
                Label("\(summary.cardioSessionCount) cardio", systemImage: WorkoutKind.cardio.systemImage)
            }
        }
    }
}
