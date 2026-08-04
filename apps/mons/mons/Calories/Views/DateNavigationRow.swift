import SwiftUI

struct DateNavigationRow: View {
    @Binding var selectedDate: Date

    let maximumDate: Date
    let calendar: Calendar

    private var dateTitle: String {
        if calendar.isDate(selectedDate, inSameDayAs: maximumDate) {
            "Today, \(selectedDate.formatted(.dateTime.month(.abbreviated).day().year()))"
        } else {
            selectedDate.formatted(
                .dateTime.weekday(.abbreviated).month(.abbreviated).day().year()
            )
        }
    }

    var body: some View {
        HStack {
            Button("Previous day", systemImage: "chevron.left", action: previousDay)
                .labelStyle(.iconOnly)
                .frame(minWidth: 44, minHeight: 44)
                .buttonStyle(.bordered)
                .buttonBorderShape(.circle)

            Spacer()

            Text(dateTitle)
                .font(MonsTypography.headline)
                .foregroundStyle(MonsColor.textWarm)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
                .accessibilityLabel("Selected day, \(dateTitle)")

            Spacer()

            Button("Next day", systemImage: "chevron.right", action: nextDay)
                .labelStyle(.iconOnly)
                .frame(minWidth: 44, minHeight: 44)
                .buttonStyle(.bordered)
                .buttonBorderShape(.circle)
                .disabled(calendar.isDate(selectedDate, inSameDayAs: maximumDate))
        }
    }

    private func previousDay() {
        selectedDate = calendar.date(byAdding: .day, value: -1, to: selectedDate) ?? selectedDate
    }

    private func nextDay() {
        let proposedDate = calendar.date(byAdding: .day, value: 1, to: selectedDate) ?? selectedDate
        selectedDate = min(proposedDate, maximumDate)
    }
}
