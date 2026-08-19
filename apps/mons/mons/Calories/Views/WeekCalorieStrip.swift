import SwiftUI

struct WeekCalorieStrip: View {
    @Binding var selectedDate: Date

    let maximumDate: Date
    let days: [CalorieDayData]
    let calendar: Calendar

    private var weekDates: [Date] {
        let selectedDay = calendar.startOfDay(for: selectedDate)
        let start = calendar.dateInterval(of: .weekOfYear, for: selectedDay)?.start ?? selectedDay

        return (0..<7).compactMap {
            calendar.date(byAdding: .day, value: $0, to: start)
        }
    }

    var body: some View {
        HStack(spacing: 0) {
            ForEach(weekDates, id: \.self) { date in
                WeekDayProgressButton(
                    date: date,
                    day: dayData(for: date),
                    selectedDate: $selectedDate,
                    maximumDate: maximumDate,
                    calendar: calendar
                )
            }
        }
        .accessibilityElement(children: .contain)
    }

    private func dayData(for date: Date) -> CalorieDayData {
        days.first { calendar.isDate($0.date, inSameDayAs: date) }
            ?? .empty(on: date)
    }
}
