import SwiftUI

struct MonsSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(MonsTypography.headline)
            .foregroundStyle(MonsColor.textPrimary)
            .frame(minHeight: 44)
            .padding(.horizontal, MonsSpacing.large)
            .glassEffect(
                .regular.interactive(),
                in: .rect(cornerRadius: MonsRadius.medium)
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.snappy(duration: 0.16), value: configuration.isPressed)
    }
}
