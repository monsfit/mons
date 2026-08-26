import SwiftUI

struct WeekDayProgressButton: View {
    let date: Date
    let day: CalorieDayData

    @Binding var selectedDate: Date

    let maximumDate: Date
    let calendar: Calendar

    private var isSelected: Bool {
        calendar.isDate(date, inSameDayAs: selectedDate)
    }

    private var isAvailable: Bool {
        date <= calendar.startOfDay(for: maximumDate)
    }

    var body: some View {
        Button(action: selectDate) {
            VStack(spacing: 3) {
                Text(date.formatted(.dateTime.weekday(.narrow)))
                    .font(.caption)

                Text(calendar.component(.day, from: date), format: .number)
                    .font(.body)
                    .fontWeight(isSelected ? .semibold : .regular)
                    .monospacedDigit()
            }
            .foregroundStyle(isSelected ? Color.white : Color.primary)
            .frame(maxWidth: .infinity, minHeight: 54, maxHeight: 54)
            .background(
                isSelected ? Color.accentColor : Color.clear,
                in: RoundedRectangle(cornerRadius: 18)
            )
            .glassEffect(
                .clear.interactive(),
                in: .rect(cornerRadius: 18)
            )
            .opacity(isAvailable ? 1 : 0.55)
        }
        .buttonStyle(.plain)
        .disabled(!isAvailable)
        .accessibilityLabel(date.formatted(date: .complete, time: .omitted))
        .accessibilityValue("\(day.consumedCalories) of \(day.calorieGoal) kilocalories")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private func selectDate() {
        selectedDate = date
    }
}
