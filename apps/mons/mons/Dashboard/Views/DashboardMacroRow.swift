import SwiftUI

struct DashboardMacroRow: View {
    let macros: MacroTotals
    let targets: NutritionTargets

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack {
                DashboardMacroMetric(
                    color: NutritionColor.protein,
                    consumed: macros.protein,
                    target: targets.protein,
                    title: "Protein"
                )
                DashboardMacroMetric(
                    color: NutritionColor.fat,
                    consumed: macros.fat,
                    target: targets.fat,
                    title: "Fat"
                )
                DashboardMacroMetric(
                    color: NutritionColor.carbohydrates,
                    consumed: macros.carbohydrates,
                    target: targets.carbohydrates,
                    title: "Carbs"
                )
            }
            VStack {
                DashboardMacroMetric(
                    color: NutritionColor.protein,
                    consumed: macros.protein,
                    target: targets.protein,
                    title: "Protein"
                )
                DashboardMacroMetric(
                    color: NutritionColor.fat,
                    consumed: macros.fat,
                    target: targets.fat,
                    title: "Fat"
                )
                DashboardMacroMetric(
                    color: NutritionColor.carbohydrates,
                    consumed: macros.carbohydrates,
                    target: targets.carbohydrates,
                    title: "Carbs"
                )
            }
        }
    }
}
