import SwiftUI

struct FoodSearchStatusView: View {
    let title: String
    let description: String
    let systemImage: String
    let showsProgress: Bool

    var body: some View {
        VStack(spacing: MonsSpacing.large) {
            if showsProgress {
                ProgressView()
                    .controlSize(.large)
            } else {
                Image(systemName: systemImage)
                    .font(.system(size: 36, weight: .regular))
                    .foregroundStyle(MonsColor.textMuted)
                    .accessibilityHidden(true)
            }

            VStack(spacing: MonsSpacing.small) {
                Text(title)
                    .font(MonsTypography.title)

                Text(description)
                    .font(MonsTypography.body)
                    .foregroundStyle(MonsColor.textSecondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 280)
        .padding(MonsSpacing.xLarge)
    }
}
