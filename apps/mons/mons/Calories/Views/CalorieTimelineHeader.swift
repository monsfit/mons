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
        .padding(.horizontal, MonsSpacing.large)
        .padding(.bottom, 12)
        .background(MonsColor.chrome)
        .overlay(alignment: .bottom) {
            Divider().overlay(MonsColor.border)
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
