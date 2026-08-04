import SwiftUI

struct DashboardNutritionCard: View {
    let day: CalorieDayData
    let onShowCalories: () -> Void

    private var targets: NutritionTargets {
        NutritionTargets(calorieGoal: day.calorieGoal)
    }

    var body: some View {
        MonsCard {
            VStack(alignment: .leading, spacing: MonsSpacing.xLarge) {
                HStack {
                    VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                        Text("TODAY'S NUTRITION")
                            .font(MonsTypography.caption)
                            .foregroundStyle(MonsColor.textWarm)
                        Text("Food Log Focus")
                            .font(MonsTypography.title)
                    }
                    Spacer()
                    Button("Open calories", systemImage: "chevron.right", action: onShowCalories)
                        .labelStyle(.iconOnly)
                        .frame(minWidth: 44, minHeight: 44)
                        .foregroundStyle(MonsColor.textWarm)
                }

                HStack {
                    VStack {
                        Text(max(day.remainingCalories, 0), format: .number)
                            .font(MonsTypography.title)
                        Text("Remaining")
                            .font(MonsTypography.subheadline)
                            .foregroundStyle(MonsColor.textSecondary)
                    }
                    .frame(maxWidth: .infinity)

                    DashboardCalorieGauge(day: day)
                        .frame(maxWidth: .infinity)

                    VStack {
                        Text(day.calorieGoal, format: .number)
                            .font(MonsTypography.title)
                        Text("Target")
                            .font(MonsTypography.subheadline)
                            .foregroundStyle(MonsColor.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                }

                DashboardMacroRow(macros: day.macros, targets: targets)
            }
        }
    }
}
