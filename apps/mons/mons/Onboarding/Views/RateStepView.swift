import SwiftUI

struct RateStepView: View {
    @Binding var rate: Double
    let goal: WeightGoal
    let estimate: NutritionPlanEstimate

    private var isStandard: Bool {
        goal == .gain ? rate <= 0.5 : rate <= 1
    }

    var body: some View {
        VStack(spacing: 28) {
            Text(isStandard ? "Standard (Recommended)" : "Faster (Use Caution)")
                .font(MonsTypography.headline)
                .foregroundStyle(isStandard ? MonsColor.success : MonsColor.action)

            Slider(value: $rate, in: 0.1...1.25, step: 0.05)
                .tint(isStandard ? MonsColor.success : MonsColor.action)

            VStack(spacing: 8) {
                Text("\(rate.formatted(.number.precision(.fractionLength(2))))% of body weight / week")
                Text("\(estimate.weeklyChangeKg.formatted(.number.precision(.fractionLength(2)))) kg / week")
                    .foregroundStyle(MonsColor.textSecondary)
            }
            .font(MonsTypography.subheadline)

            VStack(spacing: 8) {
                Text("~ \(estimate.calorieTargetKcal) kcal daily \(goal == .lose ? "ceiling" : "target")")
                    .font(MonsTypography.headline)
                if let weeks = estimate.estimatedWeeks {
                    Text("Approximately \(weeks.formatted(.number.precision(.fractionLength(1)))) weeks")
                        .foregroundStyle(MonsColor.textSecondary)
                }
                if estimate.rateLimited {
                    Text("The target was limited to 1,000 kcal/day. Choose a slower rate or consult a clinician.")
                        .foregroundStyle(MonsColor.action)
                }
            }
            .font(MonsTypography.subheadline)
            .multilineTextAlignment(.center)
        }
    }
}
