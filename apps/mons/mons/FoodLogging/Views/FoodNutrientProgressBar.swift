import SwiftUI

struct FoodNutrientProgressBar: View {
    let progress: Double?
    let accent: Color

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Rectangle()
                    .fill(MonsColor.border)

                Rectangle()
                    .fill(indicatorColor)
                    .frame(width: indicatorWidth(totalWidth: proxy.size.width))
            }
        }
        .frame(height: 4)
        .accessibilityHidden(true)
    }

    private var indicatorColor: Color {
        progress == nil ? accent.opacity(0.28) : accent
    }

    private func indicatorWidth(totalWidth: Double) -> Double {
        guard let progress else { return totalWidth }
        return totalWidth * min(max(progress, 0), 1)
    }
}
