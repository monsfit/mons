import SwiftUI

struct FoodSearchResultRow: View {
    let food: CatalogFood

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: food.datasetKind == .raw ? "fork.knife" : "shippingbox.fill")
                .font(.body)
                .foregroundStyle(food.datasetKind == .raw ? NutritionColor.calories : .secondary)
                .frame(width: 32, height: 32)
                .background(.quaternary, in: .circle)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 3) {
                Text(food.name)
                    .font(.body.weight(.medium))
                    .foregroundStyle(.primary)
                    .lineLimit(1)

                Text(detailSummary)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer(minLength: 4)

            Image(systemName: "plus.circle")
                .font(.body.weight(.medium))
                .foregroundStyle(.primary)
                .accessibilityHidden(true)
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }

    private var detailSummary: String {
        guard let brand = food.brand, !brand.isEmpty else { return nutritionSummary }
        return "\(brand) · \(nutritionSummary)"
    }

    private var nutritionSummary: String {
        let calories = food.calories ?? 0
        let protein = food.protein ?? 0
        let fat = food.totalFat ?? 0
        let carbohydrates = food.carbohydrates ?? 0
        return "\(whole(calories)) cal  \(whole(protein))P  \(whole(fat))F  \(whole(carbohydrates))C · 100 g"
    }

    private func whole(_ value: Double) -> String {
        value.formatted(.number.precision(.fractionLength(0)))
    }
}
