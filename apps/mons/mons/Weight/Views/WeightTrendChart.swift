import Charts
import SwiftUI

struct WeightTrendChart: View {
    let entries: [WeightLogEntry]
    let system: MeasurementSystem

    var body: some View {
        if entries.isEmpty {
            ContentUnavailableView(
                "No weight entries",
                systemImage: "chart.xyaxis.line",
                description: Text("Log a weight to begin your trend.")
            )
        } else {
            Chart(entries) { entry in
                LineMark(
                    x: .value("Date", entry.measuredAt),
                    y: .value("Weight", system.displayedWeight(kilograms: entry.weightKg))
                )
                .foregroundStyle(.purple)
                .interpolationMethod(.catmullRom)

                PointMark(
                    x: .value("Date", entry.measuredAt),
                    y: .value("Weight", system.displayedWeight(kilograms: entry.weightKg))
                )
                .foregroundStyle(.purple)
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
