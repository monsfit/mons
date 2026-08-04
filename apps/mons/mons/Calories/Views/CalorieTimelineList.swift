import SwiftUI

struct CalorieTimelineList: View {
    let meals: [MealEvent]
    let day: Date
    let referenceDate: Date
    let calendar: Calendar
    let onAddMeal: (Date) -> Void
    let onMoveMeal: (String, Date) -> Bool

    private var hours: ClosedRange<Int> {
        guard
            let firstHour = meals.map({ calendar.component(.hour, from: $0.loggedAt) }).min(),
            let lastHour = meals.map({ calendar.component(.hour, from: $0.loggedAt) }).max()
        else {
            return 7...20
        }

        return max(0, firstHour - 1)...min(23, lastHour + 1)
    }

    var body: some View {
        LazyVStack(alignment: .leading, spacing: 0) {
            Text("Timeline")
                .font(.title2)
                .bold()
                .padding(.bottom)

            ForEach(hours, id: \.self) { hour in
                TimelineHourLane(
                    hour: hour,
                    day: day,
                    meals: meals(in: hour),
                    isCurrentHour: isCurrentHour(hour),
                    calendar: calendar,
                    onAddMeal: onAddMeal,
                    onMoveMeal: onMoveMeal
                )
            }
        }
    }

    private func meals(in hour: Int) -> [MealEvent] {
        meals
            .filter { calendar.component(.hour, from: $0.loggedAt) == hour }
            .sorted { $0.loggedAt < $1.loggedAt }
    }

    private func isCurrentHour(_ hour: Int) -> Bool {
        calendar.isDate(day, inSameDayAs: referenceDate)
            && calendar.component(.hour, from: referenceDate) == hour
    }
}
