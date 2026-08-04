import SwiftUI

struct CalorieListView: View {
    @State private var selectedDate: Date
    @State private var days: [CalorieDayData]
    @State private var addMealRequest: AddMealRequest?

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let referenceDate: Date
    private let calendar: Calendar

    init(
        referenceDate: Date = .now,
        calendar: Calendar = .current,
        days: [CalorieDayData]? = nil
    ) {
        self.referenceDate = referenceDate
        self.calendar = calendar
        let initialDays = days ?? CalorieSampleData.days(referenceDate: referenceDate, calendar: calendar)
        _selectedDate = State(initialValue: calendar.startOfDay(for: referenceDate))
        _days = State(initialValue: initialDays)
        _addMealRequest = State(initialValue: nil)
    }

    private var selectedDay: CalorieDayData {
        days.first { calendar.isDate($0.date, inSameDayAs: selectedDate) }
            ?? .empty(on: calendar.startOfDay(for: selectedDate))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading) {
                    DateNavigationRow(
                        selectedDate: $selectedDate,
                        maximumDate: referenceDate,
                        calendar: calendar
                    )

                    WeekCalorieStrip(
                        selectedDate: $selectedDate,
                        maximumDate: referenceDate,
                        days: days,
                        calendar: calendar
                    )

                    CalorieSummaryRow(day: selectedDay)

                    MacroSummaryRow(macros: selectedDay.macros)

                    Divider()

                    Text("Calories through the day")
                        .font(.headline)

                    if selectedDay.meals.isEmpty {
                        ContentUnavailableView(
                            "No calorie activity",
                            systemImage: "chart.bar.xaxis",
                            description: Text("Meal spikes will appear here as calories are logged.")
                        )
                    } else {
                        CalorieTimingChart(
                            meals: selectedDay.meals,
                            day: selectedDay.date,
                            calendar: calendar
                        )
                    }

                    Divider()

                    CalorieTimelineList(
                        meals: selectedDay.meals,
                        day: selectedDay.date,
                        referenceDate: referenceDate,
                        calendar: calendar,
                        onAddMeal: requestMealEntry,
                        onMoveMeal: moveMeal
                    )
                }
                .padding(.horizontal)
                .padding(.bottom, 100)
            }
            .navigationDestination(for: DetailDestination.self, destination: PlaceholderDetailView.init)
            .sheet(item: $addMealRequest) { request in
                MealEntrySheet(scheduledAt: request.scheduledAt, onSave: addMeal)
            }
        }
    }

    private func requestMealEntry(at date: Date) {
        addMealRequest = AddMealRequest(scheduledAt: date)
    }

    private func addMeal(_ meal: MealEvent) {
        guard
            let dayIndex = selectedDayIndex,
            let updatedDay = CalorieScheduleEditor.adding(meal, to: days[dayIndex], calendar: calendar)
        else {
            return
        }

        updateDay(updatedDay, at: dayIndex)
    }

    private func moveMeal(_ identifier: String, to destination: Date) -> Bool {
        guard
            let dayIndex = selectedDayIndex,
            let updatedDay = CalorieScheduleEditor.rescheduling(
                meal: identifier,
                to: destination,
                in: days[dayIndex],
                calendar: calendar
            )
        else {
            return false
        }

        updateDay(updatedDay, at: dayIndex)
        return true
    }

    private var selectedDayIndex: Int? {
        days.firstIndex { calendar.isDate($0.date, inSameDayAs: selectedDate) }
    }

    private func updateDay(_ day: CalorieDayData, at index: Int) {
        if reduceMotion {
            days[index] = day
        } else {
            withAnimation(.snappy) {
                days[index] = day
            }
        }
    }
}

#Preview("Calories") {
    CalorieListView()
}
