import SwiftUI

struct FoodNutritionDetailRow: View {
    let title: String
    let value: Double
    let unit: String
    let color: Color

    var body: some View {
        HStack {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
                .accessibilityHidden(true)

            Text(title)
            Spacer()
            Text("\(value.formatted(.number.precision(.fractionLength(1)))) \(unit)")
                .foregroundStyle(MonsColor.textSecondary)
        }
        .font(MonsTypography.subheadline)
        .padding(.horizontal, 14)
        .frame(minHeight: 48)
        .overlay(alignment: .bottom) {
            Divider()
                .padding(.leading, 14)
        }
        .accessibilityElement(children: .combine)
    }
}
