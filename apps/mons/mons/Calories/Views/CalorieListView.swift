import SwiftUI

struct CalorieListView: View {
    @Environment(AppStore.self) private var store

    @State private var selectedDate: Date
    @State private var addMealRequest: AddMealRequest?
    @State private var editingMealLog: MealLog?

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
            let meals = store.meals.mealLogs
                .filter { calendar.isDate($0.loggedAt, inSameDayAs: date) }
                .map(\.mealEvent)
            return CalorieDayData(date: date, calorieGoal: store.calorieGoal, meals: meals)
        }
    }

    private var selectedDay: CalorieDayData {
        days.first { calendar.isDate($0.date, inSameDayAs: selectedDate) }
            ?? .empty(on: calendar.startOfDay(for: selectedDate))
    }

    private var sortedMeals: [MealEvent] {
        selectedDay.meals.sorted { $0.loggedAt > $1.loggedAt }
    }

    private var composerLogDate: Date {
        if calendar.isDateInToday(selectedDate) {
            return referenceDate
        }

        let time = calendar.dateComponents([.hour, .minute, .second], from: referenceDate)
        return calendar.date(
            bySettingHour: time.hour ?? 12,
            minute: time.minute ?? 0,
            second: time.second ?? 0,
            of: selectedDate
        ) ?? selectedDate
    }

    var body: some View {
        NavigationStack {
            List {
                if store.meals.isLoading && store.meals.mealLogs.isEmpty {
                    ProgressView("Loading food log…")
                        .frame(maxWidth: .infinity)
                }

                CalorieSummaryRow(day: selectedDay)
                    .listRowInsets(.init(top: 16, leading: 16, bottom: 16, trailing: 16))
                    .listRowSeparator(.hidden)

                Section("Meals") {
                    if sortedMeals.isEmpty {
                        Text("No meals logged.")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(sortedMeals) { meal in
                            Button {
                                editMeal(meal)
                            } label: {
                                CalorieMealRow(meal: meal)
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    Button("Add Food", systemImage: "plus", action: requestMealEntry)
                }
            }
            .listStyle(.plain)
            .safeAreaInset(edge: .top, spacing: 0) {
                CalorieTimelineHeader(
                    selectedDate: $selectedDate,
                    maximumDate: referenceDate,
                    days: days,
                    calendar: calendar
                )
            }
#if os(iOS)
            .modifier(FoodLogSearchAccessory(loggedAt: composerLogDate))
#endif
#if os(iOS)
            .toolbar(.hidden, for: .navigationBar)
#endif
            .sheet(item: $addMealRequest) { request in
                FoodSearchView(
                    loggedAt: request.scheduledAt,
                    startsWithScanner: request.mode == .scanner
                ) { }
            }
            .sheet(item: $editingMealLog) { meal in
                MealLogDetailView(meal: meal) {
                    editingMealLog = nil
                }
            }
            .task(id: selectedDate) {
                await store.meals.load(around: selectedDate)
            }
        }
    }

    private func requestMealEntry() {
        addMealRequest = AddMealRequest(scheduledAt: composerLogDate)
    }

    private func editMeal(_ meal: MealEvent) {
        guard let mealId = UUID(uuidString: meal.id) else { return }
        editingMealLog = store.meals.mealLogs.first { $0.mealId == mealId }
    }
}

#Preview("Calories") {
    CalorieListView(days: CalorieSampleData.days(referenceDate: .now, calendar: .current))
        .environment(AppStore.preview)
}
