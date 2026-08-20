#if DEBUG && os(iOS)
import SwiftUI

struct MealComposerQuickAddNutritionField: View {
    let title: String
    let unit: String
    @Binding var value: Double

    var body: some View {
        VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)

            HStack(spacing: MonsSpacing.xSmall) {
                TextField(title, value: $value, format: .number)
                    .keyboardType(.decimalPad)

                Text(unit)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, MonsSpacing.medium)
            .frame(minHeight: 52)
            .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 18))
        }
    }
}
#endif
