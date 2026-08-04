import SwiftUI

struct CompletionStepView: View {
    let estimate: NutritionPlanEstimate
    let goal: WeightGoal

    var body: some View {
        VStack(alignment: .leading, spacing: 28) {
            Text("Almost There")
                .font(.largeTitle.weight(.bold))

            HStack(spacing: 0) {
                ForEach(["person.fill", "scalemass.fill", "target", "fork.knife"], id: \.self) { image in
                    Image(systemName: image)
                        .font(.caption)
                        .foregroundStyle(.background)
                        .frame(width: 30, height: 30)
                        .background(.primary, in: .circle)
                    Rectangle()
                        .fill(.primary)
                        .frame(height: 1)
                }
                Image(systemName: "checkmark")
                    .font(.caption)
                    .frame(width: 30, height: 30)
                    .background(.secondary.opacity(0.15), in: .circle)
            }

            Text("Program")
                .font(.headline)

            Text("Mons will begin with a \(estimate.calorieTargetKcal) kcal daily \(goal == .lose ? "ceiling" : "target") and adapt as your logged intake and weight provide better evidence.")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Text("This adult planning estimate is not medical advice and is not designed for pregnancy or breastfeeding.")
                .font(.footnote)
                .foregroundStyle(.tertiary)
        }
    }
}
