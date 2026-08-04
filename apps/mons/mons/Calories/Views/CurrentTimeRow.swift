import SwiftUI

struct CurrentTimeRow: View {
    let date: Date

    var body: some View {
        HStack {
            Text(date, format: .dateTime.hour().minute())
                .foregroundStyle(.secondary)

            Image(systemName: "clock.fill")
                .foregroundStyle(.tint)
                .accessibilityHidden(true)

            Divider()

            Text("Now")
                .bold()
                .foregroundStyle(.tint)
        }
        .font(.subheadline)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Current time, \(date.formatted(date: .omitted, time: .shortened))")
    }
}
