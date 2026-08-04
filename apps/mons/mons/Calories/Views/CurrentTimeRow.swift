import SwiftUI

struct CurrentTimeRow: View {
    let date: Date

    var body: some View {
        HStack {
            Text(date, format: .dateTime.hour().minute())
                .foregroundStyle(MonsColor.textSecondary)

            Image(systemName: "clock.fill")
                .foregroundStyle(MonsColor.action)
                .accessibilityHidden(true)

            Divider()

            Text("Now")
                .bold()
                .foregroundStyle(MonsColor.action)
        }
        .font(MonsTypography.subheadline)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Current time, \(date.formatted(date: .omitted, time: .shortened))")
    }
}
