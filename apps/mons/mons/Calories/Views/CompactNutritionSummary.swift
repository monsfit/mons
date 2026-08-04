import SwiftUI

struct CompactNutritionSummary: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let day: CalorieDayData
    let isPinned: Bool

    private var targets: NutritionTargets {
        NutritionTargets(calorieGoal: day.calorieGoal)
    }

    private var topRadius: Double {
        isPinned ? 0 : 12
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
        .padding(12)
        .background(
            isPinned ? MonsColor.chrome : MonsColor.surfaceRaised,
            in: .rect(
                topLeadingRadius: topRadius,
                bottomLeadingRadius: 12,
                bottomTrailingRadius: 12,
                topTrailingRadius: topRadius
            )
        )
        .padding(.horizontal, isPinned ? 0 : 16)
        .padding(.top, isPinned ? 0 : 8)
        .padding(.bottom, 8)
        .frame(maxWidth: .infinity)
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
