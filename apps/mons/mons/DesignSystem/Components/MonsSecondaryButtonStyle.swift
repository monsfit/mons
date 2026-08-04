import SwiftUI

struct MonsSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(MonsTypography.headline)
            .foregroundStyle(MonsColor.textWarm)
            .frame(minHeight: 44)
            .padding(.horizontal, MonsSpacing.large)
            .background(MonsColor.surfaceRaised.opacity(configuration.isPressed ? 0.72 : 1))
            .clipShape(.rect(cornerRadius: MonsRadius.medium))
            .overlay {
                RoundedRectangle(cornerRadius: MonsRadius.medium)
                    .stroke(MonsColor.border, lineWidth: 1)
            }
    }
}
