import SwiftUI

struct OnboardingNavigationControls: View {
    let step: OnboardingStep
    let isSaving: Bool
    let nextTitle: String
    let canContinue: Bool
    let onBack: () -> Void
    let onNext: () -> Void

    var body: some View {
        HStack {
            Button("Back", systemImage: "chevron.left", action: onBack)
                .labelStyle(.iconOnly)
                .frame(width: 48, height: 48)
                .foregroundStyle(MonsColor.textPrimary)
                .buttonStyle(.glass)
                .buttonBorderShape(.circle)
                .disabled(step == .metabolism || isSaving)

            Spacer()

            Button(action: onNext) {
                MonsAsyncActionLabel(
                    title: nextTitle,
                    loadingTitle: "Saving…",
                    systemImage: "chevron.right",
                    isLoading: isSaving
                )
                .frame(minWidth: 72)
            }
            .buttonStyle(MonsPrimaryButtonStyle())
            .frame(maxWidth: 220)
            .disabled(!canContinue || isSaving)
        }
    }
}
