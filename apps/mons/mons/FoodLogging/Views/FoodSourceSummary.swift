import SwiftUI

struct FoodSourceSummary: View {
    let food: CatalogFood

    var body: some View {
        HStack(spacing: MonsSpacing.medium) {
            Image(systemName: food.datasetKind == .raw ? "fork.knife" : "shippingbox.fill")
                .foregroundStyle(MonsColor.textSecondary)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                if let brand = food.brand, !brand.isEmpty {
                    Text(brand)
                        .font(MonsTypography.headline)
                }
                Text(food.datasetKind.title)
                    .font(MonsTypography.caption)
                    .foregroundStyle(MonsColor.textSecondary)
            }

            Spacer()
        }
        .padding(MonsSpacing.medium)
        .background(MonsColor.surface, in: .rect(cornerRadius: MonsRadius.medium))
        .overlay {
            RoundedRectangle(cornerRadius: MonsRadius.medium)
                .stroke(MonsColor.border, lineWidth: 1)
        }
    }
}
