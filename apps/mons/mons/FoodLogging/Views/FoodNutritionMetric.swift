import SwiftUI

struct FoodNutritionMetric: View {
    let title: String
    let value: Double
    let unit: String
    let color: Color
    var isPrimary = false

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value, format: .number.precision(.fractionLength(0)))
                .font(isPrimary ? .largeTitle.weight(.semibold) : .title2.weight(.semibold))
                .foregroundStyle(isPrimary ? Color.primary : color)
                .contentTransition(.numericText())

            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)

            Text(unit)
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
        .accessibilityElement(children: .combine)
    }
}
