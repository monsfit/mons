import SwiftUI

struct DashboardNutritionCard: View {
    let day: CalorieDayData
    let onShowCalories: () -> Void

    private var targets: NutritionTargets {
        NutritionTargets(calorieGoal: day.calorieGoal)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                Text("Food Log Focus")
                    .font(.title2)
                    .bold()
                Spacer()
                Button("Open calories", systemImage: "chevron.right", action: onShowCalories)
                    .labelStyle(.iconOnly)
                    .frame(minWidth: 44, minHeight: 44)
            }

            HStack {
                VStack {
                    Text(max(day.remainingCalories, 0), format: .number)
                        .font(.title2)
                        .bold()
                    Text("Remaining")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)

                DashboardCalorieGauge(day: day)
                    .frame(maxWidth: .infinity)

                VStack {
                    Text(day.calorieGoal, format: .number)
                        .font(.title2)
                        .bold()
                    Text("Target")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
            }

            DashboardMacroRow(macros: day.macros, targets: targets)
        }
        .padding()
        .background(.thinMaterial, in: .rect(cornerRadius: 20))
    }
}
