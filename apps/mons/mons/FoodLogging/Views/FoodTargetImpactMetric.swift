import SwiftUI

struct FoodTargetImpactMetric: View {
    let title: String
    let value: Double
    let target: Double
    let color: Color

    private var fraction: Double {
        guard target > 0 else { return 0 }
        return min(max(value / target, 0), 1)
    }

    private var percentage: Int {
        guard target > 0 else { return 0 }
        return Int((value / target * 100).rounded())
    }

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .stroke(color.opacity(0.12), lineWidth: 3)

                Circle()
                    .trim(from: 0, to: fraction)
                    .stroke(color, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .rotationEffect(.degrees(-90))

                Text("\(percentage)%")
                    .font(MonsTypography.headline)
                    .contentTransition(.numericText())
            }
            .frame(width: 54, height: 54)

            Text(title)
                .font(MonsTypography.caption)
                .foregroundStyle(MonsColor.textSecondary)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
        .accessibilityValue("\(percentage) percent of daily target")
    }
}
