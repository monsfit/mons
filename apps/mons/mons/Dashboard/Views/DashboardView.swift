import SwiftUI

struct DashboardView: View {
    @Environment(AppStore.self) private var store

    let onShowCalories: () -> Void
    let onShowWorkouts: () -> Void

    private let calendar: Calendar
    private let referenceDate: Date
    private let weightSystem: MeasurementSystem

    init(
        referenceDate: Date = .now,
        calendar: Calendar = .current,
        weightSystem: MeasurementSystem = .preferred,
        onShowCalories: @escaping () -> Void,
        onShowWorkouts: @escaping () -> Void
    ) {
        self.referenceDate = referenceDate
        self.calendar = calendar
        self.weightSystem = weightSystem
        self.onShowCalories = onShowCalories
        self.onShowWorkouts = onShowWorkouts
    }

    var body: some View {
        let snapshot = DashboardBuilder.snapshot(
            foodLog: store.foodLog,
            workouts: store.workouts,
            weightEntries: store.weightLog,
            calorieGoal: store.calorieGoal,
            referenceDate: referenceDate,
            calendar: calendar
        )

        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 20) {
                    DashboardHeader(date: referenceDate)
                    DashboardNutritionCard(day: snapshot.day, onShowCalories: onShowCalories)
                    DashboardWorkoutCard(snapshot: snapshot, onShowWorkouts: onShowWorkouts)
                    DashboardWeightCard(snapshot: snapshot, system: weightSystem)
                }
                .padding()
            }
            .background(Color.secondary.opacity(0.06))
            .refreshable {
                await refresh()
            }
            #if os(iOS)
            .toolbar(.hidden, for: .navigationBar)
            #endif
        }
    }

    private func refresh() async {
        await store.loadFoodLog(around: referenceDate)
        await store.loadWorkouts(referenceDate: referenceDate)
        await store.loadWeightLog(referenceDate: referenceDate)
    }
}

#Preview {
    DashboardView(onShowCalories: {}, onShowWorkouts: {})
        .environment(AppStore.preview)
}
