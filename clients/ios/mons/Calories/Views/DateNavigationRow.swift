import SwiftUI

struct DateNavigationRow: View {
    @State private var isCalendarPresented = false

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
                .buttonStyle(.glass)
                .buttonBorderShape(.circle)

            Spacer()

            Button(action: presentCalendar) {
                HStack(spacing: 8) {
                    Image(systemName: "calendar")

                    Text(dateTitle)
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                }
                .font(.headline)
                .foregroundStyle(.primary)
                .padding(.horizontal, 16)
                .frame(minHeight: 44)
                .glassEffect(.regular.interactive(), in: .capsule)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Choose date. Selected day, \(dateTitle)")
            .sheet(isPresented: $isCalendarPresented) {
                CalorieDatePicker(
                    selectedDate: $selectedDate,
                    maximumDate: maximumDate,
                    calendar: calendar
                )
            }

            Spacer()

            Button("Next day", systemImage: "chevron.right", action: nextDay)
                .labelStyle(.iconOnly)
                .frame(minWidth: 44, minHeight: 44)
                .buttonStyle(.glass)
                .buttonBorderShape(.circle)
                .disabled(calendar.isDate(selectedDate, inSameDayAs: maximumDate))
        }
    }

    private func previousDay() {
        selectedDate = calendar.date(byAdding: .day, value: -1, to: selectedDate) ?? selectedDate
    }

    private func presentCalendar() {
        isCalendarPresented = true
    }

    private func nextDay() {
        let proposedDate = calendar.date(byAdding: .day, value: 1, to: selectedDate) ?? selectedDate
        selectedDate = min(proposedDate, maximumDate)
    }
}
