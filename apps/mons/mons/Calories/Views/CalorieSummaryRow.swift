import SwiftUI

struct CalorieSummaryRow: View {
    let day: CalorieDayData

    private var targets: NutritionTargets {
        NutritionTargets(calorieGoal: day.calorieGoal)
    }

    private var calorieProgress: Double {
        guard day.calorieGoal > 0 else { return 0 }
        return min(max(Double(day.consumedCalories) / Double(day.calorieGoal), 0), 1)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            LabeledContent("Calories") {
                Text("\(day.consumedCalories.formatted()) / \(day.calorieGoal.formatted())")
                    .monospacedDigit()
            }

            ProgressView(value: calorieProgress)

            Divider()

            LabeledContent("Protein", value: "\(day.macros.protein) / \(targets.protein) g")
            LabeledContent("Carbohydrates", value: "\(day.macros.carbohydrates) / \(targets.carbohydrates) g")
            LabeledContent("Fat", value: "\(day.macros.fat) / \(targets.fat) g")
        }
    }
}
