import Foundation
import Testing
@testable import MonsDashboardFeature

struct DashboardPresentationStateTests {
    @Test func statePreservesDeterministicPresentationValues() {
        let state = DashboardPresentationState(
            calorieGoal: 2_200,
            carbohydrates: .init(consumed: 20, target: 248),
            consumedCalories: 500,
            date: Date(timeIntervalSince1970: 0),
            fat: .init(consumed: 10, target: 73),
            latestWeight: 70,
            protein: .init(consumed: 30, target: 138),
            recentWorkoutDetail: nil,
            recentWorkoutTitle: nil,
            weeklyWorkoutCount: 1,
            weeklyWorkoutMinutes: 45,
            weightChange: nil,
            weightPoints: [],
            weightUnit: "kg"
        )

        #expect(state.consumedCalories == 500)
        #expect(state.protein.target == 138)
    }
}
