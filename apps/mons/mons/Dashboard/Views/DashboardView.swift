import ClerkKitUI
import MonsDashboardFeature
import SwiftUI

struct DashboardView: View {
    @Environment(AppStore.self) private var store

    @State private var isShowingWeightEntry = false

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
            foodLog: store.meals.foodLog,
            workouts: store.workouts,
            weightEntries: store.weightLog,
            calorieGoal: store.calorieGoal,
            referenceDate: referenceDate,
            calendar: calendar
        )

        DashboardScreen(
            state: presentationState(for: snapshot),
            accountMenu: {
                UserButton()
            },
            onShowCalories: onShowCalories,
            onShowWorkouts: onShowWorkouts,
            onLogWeight: {
                isShowingWeightEntry = true
            },
            onRefresh: refresh
        )
        .sheet(isPresented: $isShowingWeightEntry) {
            WeightEntrySheet(
                initialWeightKg: snapshot.latestWeightKg
                    ?? store.nutritionPlan?.currentWeightKg
                    ?? 70,
                system: weightSystem
            ) { weightKg, date in
                await store.logWeight(weightKg: weightKg, measuredAt: date)
            }
        }
    }

    private func presentationState(for snapshot: DashboardSnapshot) -> DashboardPresentationState {
        let targets = NutritionTargets(calorieGoal: snapshot.day.calorieGoal)
        let macros = snapshot.day.macros
        let recentWorkout = snapshot.recentWorkout

        return DashboardPresentationState(
            calorieGoal: snapshot.day.calorieGoal,
            carbohydrates: .init(consumed: macros.carbohydrates, target: targets.carbohydrates),
            consumedCalories: snapshot.day.consumedCalories,
            date: referenceDate,
            fat: .init(consumed: macros.fat, target: targets.fat),
            latestWeight: displayedWeight(snapshot.latestWeightKg ?? store.nutritionPlan?.currentWeightKg),
            protein: .init(consumed: macros.protein, target: targets.protein),
            recentWorkoutDetail: recentWorkout.map {
                "\($0.durationMinutes) min · \($0.metric.summary)"
            },
            recentWorkoutTitle: recentWorkout?.title,
            weeklyWorkoutCount: snapshot.weeklyWorkoutCount,
            weeklyWorkoutMinutes: snapshot.weeklyWorkoutMinutes,
            weightChange: snapshot.weightChangeKg.map(weightSystem.displayedWeight),
            weightPoints: snapshot.weightEntries.map {
                .init(
                    date: $0.measuredAt,
                    value: weightSystem.displayedWeight(kilograms: $0.weightKg)
                )
            },
            weightUnit: weightSystem.weightSymbol
        )
    }

    private func displayedWeight(_ kilograms: Double?) -> Double? {
        kilograms.map(weightSystem.displayedWeight)
    }

    private func refresh() async {
        await store.meals.load(around: referenceDate)
        await store.loadWorkouts(referenceDate: referenceDate)
        await store.loadWeightLog(referenceDate: referenceDate)
    }
}
