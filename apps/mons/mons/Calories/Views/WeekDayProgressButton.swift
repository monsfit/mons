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

    private var progress: Double {
        guard day.calorieGoal > 0 else { return 0 }
        return min(max(Double(day.consumedCalories) / Double(day.calorieGoal), 0), 1)
    }

    var body: some View {
        Button(action: selectDate) {
            VStack(spacing: 5) {
                MiniCalorieRing(
                    weekday: date.formatted(.dateTime.weekday(.narrow)),
                    progress: progress,
                    isSelected: isSelected,
                    isOverGoal: day.remainingCalories < 0
                )

                Text(calendar.component(.day, from: date), format: .number)
                    .font(.caption)
                    .fontWeight(isSelected ? .semibold : .regular)
                    .foregroundStyle(isSelected ? .primary : .secondary)
                    .monospacedDigit()
            }
            .frame(maxWidth: .infinity, minHeight: 54)
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
