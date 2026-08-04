import SwiftUI

struct WorkoutSessionRow: View {
    let session: WorkoutSession

    var body: some View {
        HStack {
            Image(systemName: session.metric.kind.systemImage)
                .font(.title2)
                .foregroundStyle(session.metric.kind == .strength ? .indigo : .orange)
                .frame(minWidth: 32)
                .accessibilityHidden(true)

            VStack(alignment: .leading) {
                Text(session.title)
                    .font(.headline)

                Text(session.completedAt, format: .dateTime.weekday(.abbreviated).month(.abbreviated).day().hour().minute())
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Text(session.metric.summary)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing) {
                Text(session.durationMinutes, format: .number)
                    .font(.headline)
                Text("min")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(session.title), \(session.metric.kind.title)")
        .accessibilityValue("\(session.metric.summary), \(session.durationMinutes) minutes")
        .accessibilityHint("Opens the workout details placeholder")
    }
}
