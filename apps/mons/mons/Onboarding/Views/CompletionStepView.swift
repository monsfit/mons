import SwiftUI

struct CompletionStepView: View {
    let estimate: NutritionPlanEstimate
    let goal: WeightGoal

    var body: some View {
        VStack(alignment: .leading, spacing: 28) {
            Text("Almost There")
                .font(MonsTypography.display)
                .foregroundStyle(MonsColor.textPrimary)

            HStack(spacing: 0) {
                ForEach(["person.fill", "scalemass.fill", "target", "fork.knife"], id: \.self) { image in
                    Image(systemName: image)
                        .font(MonsTypography.caption)
                        .foregroundStyle(MonsColor.textPrimary)
                        .frame(width: 30, height: 30)
                        .background(MonsColor.action, in: .circle)
                    Rectangle()
                        .fill(MonsColor.action)
                        .frame(height: 1)
                }
                Image(systemName: "checkmark")
                    .font(MonsTypography.caption)
                    .frame(width: 30, height: 30)
                    .background(MonsColor.surfaceRaised, in: .circle)
            }

            Text("Program")
                .font(MonsTypography.headline)

            Text("Mons will begin with a \(estimate.calorieTargetKcal) kcal daily \(goal == .lose ? "ceiling" : "target") and adapt as your logged intake and weight provide better evidence.")
                .font(MonsTypography.subheadline)
                .foregroundStyle(MonsColor.textSecondary)

            Text("This adult planning estimate is not medical advice and is not designed for pregnancy or breastfeeding.")
                .font(MonsTypography.caption)
                .foregroundStyle(MonsColor.textMuted)
        }
    }
}
