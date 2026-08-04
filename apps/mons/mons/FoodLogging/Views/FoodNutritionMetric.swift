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
                .font(isPrimary ? MonsTypography.display : MonsTypography.title)
                .foregroundStyle(isPrimary ? MonsColor.textPrimary : color)
                .contentTransition(.numericText())

            Text(title)
                .font(MonsTypography.caption)
                .foregroundStyle(MonsColor.textSecondary)

            Text(unit)
                .font(MonsTypography.caption)
                .foregroundStyle(MonsColor.textMuted)
        }
        .accessibilityElement(children: .combine)
    }
}
