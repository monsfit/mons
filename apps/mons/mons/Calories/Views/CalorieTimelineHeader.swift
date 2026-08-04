import SwiftUI

struct CalorieTimelineHeader: View {
    @Binding var selectedDate: Date

    let maximumDate: Date
    let days: [CalorieDayData]
    let calendar: Calendar

    var body: some View {
        VStack(spacing: 8) {
            DateNavigationRow(
                selectedDate: $selectedDate,
                maximumDate: maximumDate,
                calendar: calendar
            )

            WeekCalorieStrip(
                selectedDate: $selectedDate,
                maximumDate: maximumDate,
                days: days,
                calendar: calendar
            )
        }
        .padding(.horizontal)
        .padding(.bottom, 12)
        .background(Color.primary.opacity(0.08))
        .background(.background)
        .overlay(alignment: .bottom) {
            Divider()
        }
    }
}

#Preview {
    @Previewable @State var selectedDate = Date.now

    CalorieTimelineHeader(
        selectedDate: $selectedDate,
        maximumDate: .now,
        days: CalorieSampleData.days(referenceDate: .now, calendar: .current),
        calendar: .current
    )
}
