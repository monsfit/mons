import SwiftUI

struct GoalStepView: View {
    @Binding var selection: WeightGoal

    var body: some View {
        VStack(spacing: 10) {
            ForEach(WeightGoal.allCases) { option in
                OnboardingChoiceCard(
                    title: option.title,
                    detail: option.detail,
                    systemImage: option.systemImage,
                    isSelected: selection == option
                ) {
                    selection = option
                }
            }
        }
    }
}
