import SwiftUI

struct MetabolismStepView: View {
    @Binding var selection: MetabolicSex

    var body: some View {
        VStack(spacing: 10) {
            ForEach(MetabolicSex.allCases) { option in
                OnboardingChoiceCard(
                    title: option.title,
                    detail: option.detail,
                    systemImage: "function",
                    isSelected: selection == option
                ) {
                    selection = option
                }
            }

            Text("This is a coefficient in the Mifflin–St Jeor estimate, not a gender-identity question.")
                .font(MonsTypography.caption)
                .foregroundStyle(MonsColor.textSecondary)
                .padding(.top, 8)
        }
    }
}
