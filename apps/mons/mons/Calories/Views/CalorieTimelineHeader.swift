import SwiftUI

struct CalorieTimelineHeader: View {
    @Binding var selectedDate: Date

    let maximumDate: Date
    let days: [CalorieDayData]

    let calendar: Calendar

    var body: some View {
        VStack(spacing: 16) {
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
        .background {
            Rectangle()
                .fill(.ultraThinMaterial)
                .mask {
                    LinearGradient(
                        stops: [
                            .init(color: .black, location: 0),
                            .init(color: .black, location: 0.68),
                            .init(color: .clear, location: 1)
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                }
                .ignoresSafeArea(edges: .top)
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
