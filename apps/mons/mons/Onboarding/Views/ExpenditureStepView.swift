import SwiftUI

struct ExpenditureStepView: View {
    let estimate: NutritionPlanEstimate

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("\(estimate.estimatedExpenditureKcal) kcal")
                .font(.system(size: 38, weight: .medium, design: .rounded))
                .contentTransition(.numericText())

            Text("Does this look right to you?")
                .font(.title3.weight(.semibold))

            Text("This is an initial maintenance estimate. Logged intake and weight trends can calibrate it over time.")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            LabeledContent("Resting energy", value: "\(estimate.restingEnergyKcal) kcal")
                .font(.subheadline)
        }
    }
}
