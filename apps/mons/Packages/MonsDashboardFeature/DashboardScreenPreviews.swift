import SwiftUI

private let previewDate = Date(timeIntervalSince1970: 1_775_304_000)

#Preview("Dashboard · Populated") {
    DashboardScreen(
        state: DashboardPresentationState(
            calorieGoal: 2_200,
            carbohydrates: .init(consumed: 85, target: 248),
            consumedCalories: 1_146,
            date: previewDate,
            fat: .init(consumed: 44, target: 73),
            latestWeight: 68.1,
            protein: .init(consumed: 65, target: 138),
            recentWorkoutDetail: "60 min · 5 exercises",
            recentWorkoutTitle: "Summit Push",
            weeklyWorkoutCount: 3,
            weeklyWorkoutMinutes: 145,
            weightChange: -0.7,
            weightPoints: [
                .init(date: previewDate.addingTimeInterval(-604_800), value: 68.8),
                .init(date: previewDate, value: 68.1),
            ],
            weightUnit: "kg"
        ),
        accountMenu: { Image(systemName: "person.crop.circle") },
        onShowCalories: {},
        onShowWorkouts: {},
        onLogWeight: {},
        onRefresh: {}
    )
}

#Preview("Dashboard · Empty") {
    DashboardScreen(
        state: DashboardPresentationState(
            calorieGoal: 2_200,
            carbohydrates: .init(consumed: 0, target: 248),
            consumedCalories: 0,
            date: previewDate,
            fat: .init(consumed: 0, target: 73),
            latestWeight: nil,
            protein: .init(consumed: 0, target: 138),
            recentWorkoutDetail: nil,
            recentWorkoutTitle: nil,
            weeklyWorkoutCount: 0,
            weeklyWorkoutMinutes: 0,
            weightChange: nil,
            weightPoints: [],
            weightUnit: "kg"
        ),
        accountMenu: { Image(systemName: "person.crop.circle") },
        onShowCalories: {},
        onShowWorkouts: {},
        onLogWeight: {},
        onRefresh: {}
    )
}
