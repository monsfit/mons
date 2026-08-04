import SwiftUI

struct WorkoutSessionRow: View {
    let session: WorkoutSession

    var body: some View {
        HStack {
            Image(systemName: session.metric.kind.systemImage)
                .font(MonsTypography.title)
                .foregroundStyle(MonsColor.metric)
                .frame(minWidth: 32)
                .accessibilityHidden(true)

            VStack(alignment: .leading) {
                Text(session.title)
                    .font(MonsTypography.headline)

                Text(session.completedAt, format: .dateTime.weekday(.abbreviated).month(.abbreviated).day().hour().minute())
                    .font(MonsTypography.subheadline)
                    .foregroundStyle(MonsColor.textSecondary)

                Text(session.metric.summary)
                    .font(MonsTypography.subheadline)
                    .foregroundStyle(MonsColor.textSecondary)
            }

            Spacer()

            VStack(alignment: .trailing) {
                Text(session.durationMinutes, format: .number)
                    .font(MonsTypography.headline)
                Text("min")
                    .font(MonsTypography.subheadline)
                    .foregroundStyle(MonsColor.textSecondary)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(session.title), \(session.metric.kind.title)")
        .accessibilityValue("\(session.metric.summary), \(session.durationMinutes) minutes")
        .accessibilityHint("Opens the workout details placeholder")
    }
}
