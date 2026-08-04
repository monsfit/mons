import SwiftUI

struct WorkoutWeeklySummaryRow: View {
    let summary: WorkoutWeeklySummary

    var body: some View {
        MonsCard(isRaised: true) {
            HStack(spacing: MonsSpacing.medium) {
                VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                    Text(summary.sessionCount, format: .number)
                        .font(MonsTypography.title)
                        .bold()
                    Text("Sessions")
                        .font(MonsTypography.subheadline)
                        .foregroundStyle(MonsColor.textSecondary)
                }

                Divider()

                VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                    Text(summary.totalMinutes, format: .number)
                        .font(MonsTypography.title)
                        .bold()
                    Text("Minutes")
                        .font(MonsTypography.subheadline)
                        .foregroundStyle(MonsColor.textSecondary)
                }

                Divider()

                VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                    Text(summary.totalSets, format: .number)
                        .font(MonsTypography.title)
                        .bold()
                    Text("Sets")
                        .font(MonsTypography.subheadline)
                        .foregroundStyle(MonsColor.textSecondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Weekly workout summary")
        .accessibilityValue(
            "\(summary.sessionCount) sessions, \(summary.totalMinutes) minutes, \(summary.totalSets) sets"
        )
    }
}
