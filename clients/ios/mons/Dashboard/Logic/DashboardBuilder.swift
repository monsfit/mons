import Foundation

enum DashboardBuilder {
    static func snapshot(
        foodLog: [FoodLogEntry],
        workouts: [WorkoutSession],
        weightEntries: [WeightLogEntry],
        calorieGoal: Int,
        referenceDate: Date = .now,
        calendar: Calendar = .current
    ) -> DashboardSnapshot {
        let meals = foodLog
            .filter { calendar.isDate($0.loggedAt, inSameDayAs: referenceDate) }
            .map(\.mealEvent)
        let day = CalorieDayData(
            date: calendar.startOfDay(for: referenceDate),
            calorieGoal: calorieGoal,
            meals: meals
        )
        let week = calendar.dateInterval(of: .weekOfYear, for: referenceDate)
        let weeklyWorkouts = workouts.filter { workout in
            guard let week else { return false }
            return week.contains(workout.completedAt) && workout.completedAt <= referenceDate
        }
        let sortedWeights = weightEntries.sorted()

        return DashboardSnapshot(
            day: day,
            latestWeightKg: sortedWeights.last?.weightKg,
            recentWorkout: workouts
                .filter { $0.completedAt <= referenceDate }
                .max { $0.completedAt < $1.completedAt },
            weightChangeKg: weightChange(for: sortedWeights),
            weightEntries: sortedWeights,
            weeklyWorkoutCount: weeklyWorkouts.count,
            weeklyWorkoutMinutes: weeklyWorkouts.reduce(0) { $0 + $1.durationMinutes }
        )
    }

    private static func weightChange(for entries: [WeightLogEntry]) -> Double? {
        guard let first = entries.first?.weightKg, let last = entries.last?.weightKg else {
            return nil
        }
        return last - first
    }
}
