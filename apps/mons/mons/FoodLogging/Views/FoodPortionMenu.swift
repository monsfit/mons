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
                Text(selectedPortion?.name ?? "g")
                    .lineLimit(1)

                Image(systemName: "chevron.up.chevron.down")
                    .font(MonsTypography.caption)
            }
            .frame(minHeight: 44)
            .padding(.horizontal, MonsSpacing.medium)
        }
        .buttonStyle(.glass)
        .buttonBorderShape(.capsule)
        .accessibilityLabel("Portion unit")
        .accessibilityValue(selectedPortion?.menuTitle ?? "Grams")
    }

    private func select(_ portion: FoodPortion) {
        selectedPortion = portion
        amount = 1
    }

    private func selectGrams() {
        if let gramAmount = selectedPortion?.gramAmount {
            amount *= gramAmount
        }
        selectedPortion = nil
    }
}
