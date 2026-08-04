import SwiftUI

struct FoodNutritionDetailRow: View {
    let nutrient: FoodNutrient
    let target: NutrientTarget?

    private var progress: Double {
        guard let target, target.amount > 0 else { return 0 }
        return min(max(nutrient.amount / target.amount, 0), 1)
    }

    private var percentage: Int? {
        guard let target, target.amount > 0 else { return nil }
        return Int((nutrient.amount / target.amount * 100).rounded())
    }

    var body: some View {
        VStack(spacing: MonsSpacing.small) {
            HStack(alignment: .firstTextBaseline, spacing: MonsSpacing.small) {
                Text(nutrient.displayName)
                    .fontWeight(.medium)
                    .lineLimit(2)

                Spacer(minLength: MonsSpacing.small)

                Text(valueText)
                    .foregroundStyle(MonsColor.textSecondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)

                Text(percentage.map { "\($0)%" } ?? "No DV")
                    .foregroundStyle(percentage == nil ? MonsColor.textMuted : MonsColor.textPrimary)
                    .frame(minWidth: 48, alignment: .trailing)
            }

            if target != nil {
                ProgressView(value: progress)
                    .progressViewStyle(.linear)
                    .tint(MonsColor.metric)
                    .accessibilityHidden(true)
            }
        }
        .font(MonsTypography.subheadline)
        .padding(.horizontal, MonsSpacing.large)
        .padding(.vertical, MonsSpacing.medium)
        .frame(minHeight: 56)
        .accessibilityElement(children: .combine)
        .accessibilityValue(accessibilityValue)
    }

    private var valueText: String {
        let value = nutrient.amount.formatted(.number.precision(.fractionLength(0...2)))
        guard let target else { return "\(value) \(nutrient.unit)" }
        let targetValue = target.amount.formatted(.number.precision(.fractionLength(0...2)))
        return "\(value) / \(targetValue) \(target.unit)"
    }

    private var accessibilityValue: String {
        guard let percentage else {
            return "\(valueText), no FDA Daily Value"
        }
        return "\(valueText), \(percentage) percent of target"
    }
}
