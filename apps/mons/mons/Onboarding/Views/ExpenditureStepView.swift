import SwiftUI

struct ExpenditureStepView: View {
    let estimate: NutritionPlanEstimate

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("\(estimate.estimatedExpenditureKcal) kcal")
                .font(MonsTypography.display)
                .foregroundStyle(MonsColor.textPrimary)
                .contentTransition(.numericText())

            Text("Does this look right to you?")
                .font(MonsTypography.sectionTitle)

            Text("This is an initial maintenance estimate. Logged intake and weight trends can calibrate it over time.")
                .font(MonsTypography.subheadline)
                .foregroundStyle(MonsColor.textSecondary)

            LabeledContent("Resting energy", value: "\(estimate.restingEnergyKcal) kcal")
                .font(MonsTypography.subheadline)
        }
    }
}
