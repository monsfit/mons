import MonsDesignSystem
import SwiftUI

struct DashboardWeightPresentationCard: View {
    let state: DashboardPresentationState
    let onLogWeight: () -> Void

    var body: some View {
        MonsCard {
            VStack(alignment: .leading, spacing: MonsSpacing.large) {
                HStack {
                    Label("Weight Trend", systemImage: "scalemass").font(MonsTypography.title)
                    Spacer()
                    Button("Log weight", systemImage: "plus", action: onLogWeight)
                        .buttonStyle(MonsSecondaryButtonStyle())
                }

                if let weight = state.latestWeight {
                    HStack(alignment: .firstTextBaseline) {
                        Text(weight, format: .number.precision(.fractionLength(1)))
                            .font(MonsTypography.metric)
                        Text(state.weightUnit)
                            .font(MonsTypography.subheadline)
                            .foregroundStyle(MonsColor.textSecondary)
                        Spacer()
                        if let change = state.weightChange {
                            Text(change, format: .number.sign(strategy: .always()).precision(.fractionLength(1)))
                                .font(MonsTypography.headline)
                        }
                    }
                }

                WeightSparkline(points: state.weightPoints)
                    .frame(height: 96)
            }
        }
    }
}

private struct WeightSparkline: View {
    let points: [DashboardPresentationState.WeightPoint]

    var body: some View {
        GeometryReader { geometry in
            Path { path in
                guard points.count > 1 else { return }
                let values = points.map(\.value)
                let lower = values.min() ?? 0
                let upper = values.max() ?? lower
                let range = max(upper - lower, 0.1)
                for (index, point) in points.enumerated() {
                    let x = geometry.size.width * Double(index) / Double(points.count - 1)
                    let y = geometry.size.height * (1 - (point.value - lower) / range)
                    if index == 0 { path.move(to: CGPoint(x: x, y: y)) }
                    else { path.addLine(to: CGPoint(x: x, y: y)) }
                }
            }
            .stroke(MonsColor.weightAccent, style: StrokeStyle(lineWidth: 3, lineJoin: .round))
        }
        .accessibilityLabel("Weight trend")
    }
}
