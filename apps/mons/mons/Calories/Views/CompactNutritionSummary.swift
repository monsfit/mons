import SwiftUI

struct CompactNutritionSummary: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let day: CalorieDayData
    let isPinned: Bool

    private var targets: NutritionTargets {
        NutritionTargets(calorieGoal: day.calorieGoal)
    }

    var body: some View {
        HStack(spacing: 12) {
            NutritionProgressMetric(
                label: "Calories",
                accessibilityName: "Calories",
                systemImage: "flame.fill",
                value: day.consumedCalories,
                goal: targets.calories,
                color: NutritionColor.calories
            )
            NutritionProgressMetric(
                label: "P",
                accessibilityName: "Protein",
                systemImage: nil,
                value: day.macros.protein,
                goal: targets.protein,
                color: NutritionColor.protein
            )
            NutritionProgressMetric(
                label: "F",
                accessibilityName: "Fat",
                systemImage: nil,
                value: day.macros.fat,
                goal: targets.fat,
                color: NutritionColor.fat
            )
            NutritionProgressMetric(
                label: "C",
                accessibilityName: "Carbohydrates",
                systemImage: nil,
                value: day.macros.carbohydrates,
                goal: targets.carbohydrates,
                color: NutritionColor.carbohydrates
            )
        }
        .padding(.horizontal, 12)
        .padding(.vertical, isPinned ? 12 : 0)
        .background(MonsColor.chrome)
        .frame(maxWidth: .infinity)
        .frame(maxHeight: isPinned ? nil : 0)
        .opacity(isPinned ? 1 : 0)
        .clipped()
        .overlay(alignment: .bottom) {
            Divider()
                .overlay(MonsColor.border)
                .opacity(isPinned ? 1 : 0)
        }
        .animation(reduceMotion ? nil : .snappy(duration: 0.22), value: isPinned)
    }
}

#Preview {
    CompactNutritionSummary(
        day: CalorieSampleData.days(referenceDate: .now, calendar: .current)[0],
        isPinned: false
    )
}
