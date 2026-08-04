import SwiftUI

struct NutritionProgressMetric: View {
    let label: String
    let accessibilityName: String
    let systemImage: String?
    let value: Int
    let goal: Int
    let color: Color

    private var progress: Double {
        guard goal > 0 else { return 0 }
        return min(max(Double(value) / Double(goal), 0), 1)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 3) {
                if let systemImage {
                    Image(systemName: systemImage)
                        .foregroundStyle(color)
                        .accessibilityHidden(true)
                } else {
                    Text(label)
                        .bold()
                        .foregroundStyle(color)
                }

                Text("\(value.formatted()) / \(goal.formatted())")
                    .foregroundStyle(MonsColor.textPrimary)
                    .monospacedDigit()
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }
            .font(MonsTypography.caption)

            ProgressView(value: progress)
                .tint(color)
                .background(color.opacity(0.38), in: .capsule)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityName)
        .accessibilityValue("\(value) of \(goal)")
    }
}
