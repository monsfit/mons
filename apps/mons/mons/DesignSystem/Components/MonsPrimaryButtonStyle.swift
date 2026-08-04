import SwiftUI

public struct MonsPrimaryButtonStyle: ButtonStyle {
    public var tint = MonsColor.actionSurface
    public var foreground = MonsColor.actionForeground

    public init(tint: Color = MonsColor.actionSurface, foreground: Color = MonsColor.actionForeground) {
        self.tint = tint
        self.foreground = foreground
    }

    public func makeBody(configuration: Configuration) -> some View {
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
