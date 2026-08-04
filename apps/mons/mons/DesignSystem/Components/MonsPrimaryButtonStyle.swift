import SwiftUI

struct MonsPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(MonsTypography.headline)
            .foregroundStyle(MonsColor.actionForeground)
            .frame(maxWidth: .infinity, minHeight: 52)
            .padding(.horizontal, MonsSpacing.large)
            .background(MonsColor.actionSurface.opacity(configuration.isPressed ? 0.78 : 1))
            .clipShape(.rect(cornerRadius: MonsRadius.medium))
    }
}
