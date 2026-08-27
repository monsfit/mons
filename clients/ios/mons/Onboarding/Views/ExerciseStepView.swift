import SwiftUI

struct ExerciseStepView: View {
    @Binding var selection: ExerciseFrequency

    var body: some View {
        VStack(spacing: 10) {
            ForEach(ExerciseFrequency.allCases) { option in
                OnboardingChoiceCard(
                    title: option.title,
                    detail: nil,
                    systemImage: option.systemImage,
                    isSelected: selection == option
                ) {
                    selection = option
                }
            }
        }
    }
}
