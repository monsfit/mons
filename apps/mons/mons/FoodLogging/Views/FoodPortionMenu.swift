import SwiftUI

struct FoodPortionMenu: View {
    @Binding var amount: Double
    @Binding var selectedPortion: FoodPortion?

    let portions: [FoodPortion]

    var body: some View {
        Menu {
            Button("Grams", action: selectGrams)

            ForEach(portions) { portion in
                Button(portion.menuTitle) {
                    select(portion)
                }
            }
        } label: {
            HStack(spacing: MonsSpacing.xSmall) {
                Text(selectedPortion?.menuTitle ?? "Grams")
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)

                Image(systemName: "chevron.up.chevron.down")
                    .font(MonsTypography.caption)
            }
            .frame(minHeight: 44)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, MonsSpacing.medium)
        }
        .buttonStyle(.glass)
        .buttonBorderShape(.capsule)
        .accessibilityLabel("Portion unit")
        .accessibilityValue(selectedPortion?.menuTitle ?? "Grams")
    }

    private func select(_ portion: FoodPortion) {
        let currentGrams = amount * (selectedPortion?.gramAmount ?? 1)
        selectedPortion = portion
        amount = currentGrams / portion.amount
    }

    private func selectGrams() {
        if let gramAmount = selectedPortion?.gramAmount {
            amount *= gramAmount
        }
        selectedPortion = nil
    }
}
