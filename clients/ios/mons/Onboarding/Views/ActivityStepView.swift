import SwiftUI

struct ActivityStepView: View {
    @Binding var selection: DailyActivity

    var body: some View {
        VStack(spacing: 10) {
            ForEach(DailyActivity.allCases) { option in
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
