import SwiftUI

struct MonsPrimaryButtonStyle: ButtonStyle {
    var tint = MonsColor.actionSurface
    var foreground = MonsColor.actionForeground

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(MonsTypography.headline)
            .foregroundStyle(foreground)
            .frame(maxWidth: .infinity, minHeight: 52)
            .padding(.horizontal, MonsSpacing.large)
            .glassEffect(
                .regular.tint(tint).interactive(),
                in: .rect(cornerRadius: MonsRadius.medium)
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.snappy(duration: 0.16), value: configuration.isPressed)
    }
}
