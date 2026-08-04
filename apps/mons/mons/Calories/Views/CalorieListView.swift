import SwiftUI

struct CalorieListView: View {
    @Environment(AppStore.self) private var store

    @State private var selectedDate: Date
    @State private var addMealRequest: AddMealRequest?
    @State private var isNutritionSummaryPinned = false

    private let referenceDate: Date
    private let calendar: Calendar
    private let previewDays: [CalorieDayData]?

    init(
        referenceDate: Date = .now,
        calendar: Calendar = .current,
        days: [CalorieDayData]? = nil
    ) {
        self.referenceDate = referenceDate
        self.calendar = calendar
        previewDays = days
        _selectedDate = State(initialValue: calendar.startOfDay(for: referenceDate))
        _addMealRequest = State(initialValue: nil)
    }

    private var days: [CalorieDayData] {
        if let previewDays {
            return previewDays
        }
        return (-7...7).compactMap { offset in
            guard let date = calendar.date(byAdding: .day, value: offset, to: selectedDate) else {
                return nil
            }
            let meals = store.foodLog
                .filter { calendar.isDate($0.loggedAt, inSameDayAs: date) }
                .map(\.mealEvent)
            return CalorieDayData(date: date, calorieGoal: store.calorieGoal, meals: meals)
        }
    }

    private var selectedDay: CalorieDayData {
        days.first { calendar.isDate($0.date, inSameDayAs: selectedDate) }
            ?? .empty(on: calendar.startOfDay(for: selectedDate))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16, pinnedViews: [.sectionHeaders]) {
                    CalorieSummaryRow(day: selectedDay)
                        .padding(.horizontal)
                        .scrollTransition(.interactive, axis: .vertical) { content, phase in
                            content
                                .opacity(phase.isIdentity ? 1 : 0)
                        }

                    Section {
                        CalorieTimingChart(
                            meals: selectedDay.meals,
                            day: selectedDay.date,
                            calendar: calendar
                        )
                        .padding(.top, 12)
                        .padding(.horizontal)

                        Divider()
                            .padding(.horizontal)
                            .padding(.vertical, 8)

                        CalorieTimelineList(
                            meals: selectedDay.meals,
                            day: selectedDay.date,
                            referenceDate: referenceDate,
                            calendar: calendar,
                            onAddMeal: requestMealEntry,
                            onMoveMeal: moveMeal
                        )
                        .padding(.horizontal)
                    } header: {
                        CompactNutritionSummary(
                            day: selectedDay,
                            isPinned: isNutritionSummaryPinned
                        )
                        .onGeometryChange(for: Bool.self) { geometry in
                            geometry.frame(in: .scrollView(axis: .vertical)).minY <= 0
                        } action: { isPinned in
                            isNutritionSummaryPinned = isPinned
                        }
                    }
                }
                .padding(.vertical)
            }
            .background(Color.secondary.opacity(0.06))
            .safeAreaInset(edge: .top, spacing: 0) {
                CalorieTimelineHeader(
                    selectedDate: $selectedDate,
                    maximumDate: referenceDate,
                    days: days,
                    calendar: calendar
                )
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                FoodQuickAddBar(onSearch: addFood, onScan: scanFood)
            }
#if os(iOS)
            .toolbar(.hidden, for: .navigationBar)
#endif
            .navigationDestination(for: DetailDestination.self, destination: PlaceholderDetailView.init)
            .sheet(item: $addMealRequest) { request in
                FoodSearchView(
                    loggedAt: request.scheduledAt,
                    startsWithScanner: request.mode == .scanner
                ) { }
            }
            .task(id: selectedDate) {
                await store.loadFoodLog(around: selectedDate)
            }
        }
    }

    private func requestMealEntry(at date: Date) {
        addMealRequest = AddMealRequest(scheduledAt: date)
    }

    private func addFood() {
        addMealRequest = AddMealRequest(scheduledAt: defaultMealTime)
    }

    private func scanFood() {
        addMealRequest = AddMealRequest(scheduledAt: defaultMealTime, mode: .scanner)
    }

    private var defaultMealTime: Date {
        let scheduledAt: Date
        if calendar.isDate(selectedDate, inSameDayAs: referenceDate) {
            scheduledAt = referenceDate
        } else {
            scheduledAt = calendar.date(bySettingHour: 12, minute: 0, second: 0, of: selectedDate)
                ?? selectedDate
        }
        return scheduledAt
    }

    private func moveMeal(_ identifier: String, to destination: Date) -> Bool {
        guard let entryId = UUID(uuidString: identifier) else { return false }
        Task {
            await store.rescheduleFoodLogEntry(entryId, to: destination)
        }
        return true
    }

}

#Preview("Calories") {
    CalorieListView(days: CalorieSampleData.days(referenceDate: .now, calendar: .current))
        .environment(AppStore.preview)
}
