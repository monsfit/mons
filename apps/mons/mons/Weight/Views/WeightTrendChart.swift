import Charts
import SwiftUI

struct WeightTrendChart: View {
    let entries: [WeightLogEntry]
    let system: MeasurementSystem

    var body: some View {
        if entries.isEmpty {
            HStack(spacing: MonsSpacing.medium) {
                Image(systemName: "chart.xyaxis.line")
                    .font(MonsTypography.title)
                    .foregroundStyle(MonsColor.metric)
                    .frame(width: 44, height: 44)
                    .background(MonsColor.surfaceRaised, in: .rect(cornerRadius: MonsRadius.small))
                    .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                    Text("No weight entries")
                        .font(MonsTypography.headline)
                    Text("Log a weight to begin your trend.")
                        .font(MonsTypography.subheadline)
                        .foregroundStyle(MonsColor.textSecondary)
                }

                Spacer()
            }
            .accessibilityElement(children: .combine)
        } else {
            Chart(entries) { entry in
                LineMark(
                    x: .value("Date", entry.measuredAt),
                    y: .value("Weight", system.displayedWeight(kilograms: entry.weightKg))
                )
                .foregroundStyle(MonsColor.metric)
                .interpolationMethod(.catmullRom)

                PointMark(
                    x: .value("Date", entry.measuredAt),
                    y: .value("Weight", system.displayedWeight(kilograms: entry.weightKg))
                )
                .foregroundStyle(MonsColor.metric)
                .symbolSize(35)
            }
            .chartYScale(domain: yDomain)
            .chartXAxis {
                AxisMarks(values: .automatic(desiredCount: 4)) {
                    AxisGridLine()
                    AxisValueLabel(format: .dateTime.month(.abbreviated).day())
                }
            }
            .chartYAxisLabel(system.weightSymbol)
            .frame(minHeight: 180)
            .accessibilityLabel("Weight trend")
        }
    }

    private var yDomain: ClosedRange<Double> {
        let values = entries.map { system.displayedWeight(kilograms: $0.weightKg) }
        guard let minimum = values.min(), let maximum = values.max() else { return 0...1 }
        let minimumPadding = system == .metric ? 1.0 : 2.0
        let padding = max((maximum - minimum) * 0.3, minimumPadding)
        return (minimum - padding)...(maximum + padding)
    }
}
