import Testing
@testable import mons

struct NutritionTargetsTests {
    @Test func derivesStableMacroTargetsFromCalories() {
        let targets = NutritionTargets(calorieGoal: 2_200)

        #expect(targets.calories == 2_200)
        #expect(targets.protein == 138)
        #expect(targets.fat == 73)
        #expect(targets.carbohydrates == 248)
    }

    @Test func clampsNegativeCalorieGoals() {
        let targets = NutritionTargets(calorieGoal: -1)

        #expect(targets == NutritionTargets(calorieGoal: 0))
    }
}
