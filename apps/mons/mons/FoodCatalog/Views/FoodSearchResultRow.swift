import SwiftUI

struct FoodSearchResultRow: View {
    let food: CatalogFood

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: food.datasetKind == .raw ? "fork.knife" : "shippingbox.fill")
                .font(MonsTypography.body)
                .foregroundStyle(food.datasetKind == .raw ? NutritionColor.calories : MonsColor.performance)
                .frame(width: 32, height: 32)
                .background(MonsColor.surfaceRaised, in: .circle)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 3) {
                Text(food.name)
                    .font(MonsTypography.headline)
                    .foregroundStyle(MonsColor.textPrimary)
                    .lineLimit(1)

                Text(detailSummary)
                    .font(MonsTypography.caption)
                    .foregroundStyle(MonsColor.textSecondary)
                    .lineLimit(1)
            }

            Spacer(minLength: 4)

            Image(systemName: "plus.circle")
                .font(MonsTypography.sectionTitle)
                .foregroundStyle(MonsColor.action)
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
