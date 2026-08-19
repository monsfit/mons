#if os(iOS)
import SwiftUI

struct MealVoiceWaveformView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let levels: [Double]
    let isActive: Bool

    var body: some View {
        ZStack {
            Capsule()
                .fill(MonsColor.border)
                .frame(height: 1)

            HStack(spacing: 2) {
                ForEach(levels.indices, id: \.self) { index in
                    Capsule()
                        .fill(isActive ? MonsColor.action : MonsColor.textMuted)
                        .frame(maxWidth: .infinity)
                        .frame(height: max(3, levels[index] * 52))
                }
            }
        }
        .frame(maxWidth: .infinity, minHeight: 60)
        .animation(reduceMotion ? nil : .smooth(duration: 0.12), value: levels)
        .accessibilityHidden(true)
    }
}
#endif
