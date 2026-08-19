import Testing
@testable import mons

struct NutrientReferenceTargetsTests {
    private let targets = NutrientReferenceTargets(
        nutritionTargets: NutritionTargets(calorieGoal: 2_200)
    )

    @Test func usesPersonalizedCalorieAndMacroTargets() {
        #expect(target(for: "calories", unit: "kcal")?.amount == 2_200)
        #expect(target(for: "protein", unit: "g")?.amount == 138)
        #expect(target(for: "total_fat", unit: "g")?.amount == 73)
        #expect(target(for: "carbohydrates_total", unit: "g")?.amount == 248)
    }

    @Test func usesStableFdaDailyValuesForMicronutrients() {
        #expect(target(for: "sodium", unit: "mg")?.amount == 2_300)
        #expect(target(for: "zinc", unit: "mg")?.amount == 11)
        #expect(target(for: "choline", unit: "mg")?.amount == 550)
        #expect(target(for: "vitamin_b12_cobalamin", unit: "mcg")?.amount == 2.4)
    }

    @Test func omitsNutrientsWithoutACompatibleDailyValue() {
        #expect(target(for: "total_sugars", unit: "g") == nil)
        #expect(target(for: "caffeine", unit: "mg") == nil)
        #expect(target(for: "vitamin_a_retinol", unit: "mcg") == nil)
        #expect(target(for: "sodium", unit: "g") == nil)
    }

    private func target(for field: String, unit: String) -> NutrientTarget? {
        targets.target(
            for: FoodNutrient(amount: 1, field: field, name: field, unit: unit)
        )
    }
}
