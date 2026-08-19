#if os(iOS)
import SwiftUI

struct FoodSearchInlineVoiceStatus: View {
    let elapsedTime: TimeInterval
    let levels: [Double]

    var body: some View {
        HStack(spacing: MonsSpacing.small) {
            Text(formattedElapsedTime)
                .font(.caption.monospacedDigit())
                .foregroundStyle(MonsColor.textSecondary)

            HStack(spacing: 2) {
                ForEach(Array(levels.suffix(14).enumerated()), id: \.offset) { _, level in
                    Capsule()
                        .fill(MonsColor.action)
                        .frame(maxWidth: .infinity)
                        .frame(height: max(3, level * 28))
                }
            }
            .frame(maxWidth: .infinity, minHeight: 30)
            .animation(.smooth(duration: 0.12), value: levels)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Recording voice")
        .accessibilityValue(formattedElapsedTime)
    }

    private var formattedElapsedTime: String {
        Duration.seconds(elapsedTime).formatted(.time(pattern: .minuteSecond))
    }
}
#endif
