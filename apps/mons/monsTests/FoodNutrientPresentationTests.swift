import Testing
@testable import mons

struct FoodNutrientPresentationTests {
    @Test func fatBreakdownUsesCanonicalNonzeroRows() {
        let nutrients = [
            nutrient("total_fat", amount: 12, name: "Fat"),
            nutrient("monounsaturated_fat", amount: 0, name: "Monounsaturated Fat"),
            nutrient("saturated_fat", amount: 3.5, name: "Saturated Fat"),
            nutrient("omega_3_total_reported", amount: 0.4, name: "Source total"),
            nutrient("omega_3_ala_epa_dha_sum", amount: 0.3, name: "Computed total"),
            nutrient("omega_3_ala", amount: 0.1, name: "Alpha-linolenic acid"),
            nutrient("omega_3_epa", amount: 0.1, name: "Eicosapentaenoic acid"),
            nutrient("omega_3_dha", amount: 0.1, name: "Docosahexaenoic acid"),
            nutrient("omega_6_linoleic_acid", amount: 1.2, name: "Linoleic acid"),
        ]

        let presented = FoodNutrientPresentation.nutrients(nutrients, in: .fats)

        #expect(presented.map(\.field) == [
            "total_fat",
            "saturated_fat",
            "omega_3_total_reported",
            "omega_6_linoleic_acid",
        ])
        #expect(presented.map(\.displayName) == [
            "Total Fat",
            "Saturated Fat",
            "Omega-3 Fat",
            "Omega-6 Fat",
        ])
    }

    @Test func fatBreakdownFallsBackToComputedOmegaThree() {
        let nutrients = [
            nutrient("total_fat", amount: 0, name: "Fat"),
            nutrient("omega_3_ala_epa_dha_sum", amount: 0.25, name: "Computed total"),
        ]

        let presented = FoodNutrientPresentation.nutrients(nutrients, in: .fats)

        #expect(presented.map(\.field) == ["total_fat", "omega_3_ala_epa_dha_sum"])
    }

    private func nutrient(_ field: String, amount: Double, name: String) -> FoodNutrient {
        FoodNutrient(amount: amount, field: field, name: name, unit: "g")
    }
}
