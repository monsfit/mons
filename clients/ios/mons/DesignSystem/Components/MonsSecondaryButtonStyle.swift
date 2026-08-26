import SwiftUI

public struct MonsSecondaryButtonStyle: ButtonStyle {
    public init() {}

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(MonsTypography.headline)
            .foregroundStyle(MonsColor.textPrimary)
            .frame(minHeight: 44)
            .padding(.horizontal, MonsSpacing.large)
            .contentShape(.capsule)
            .glassEffect(
                .regular.interactive(),
                in: .capsule
            )
    }
}
