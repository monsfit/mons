import SwiftUI

struct FoodLogQuantityControls: View {
    @Binding var amount: Double
    @Binding var selectedPortion: FoodPortion?

    let portions: [FoodPortion]

    var body: some View {
        HStack(spacing: MonsSpacing.small) {
            TextField("Amount", value: $amount, format: .number)
                .textFieldStyle(.plain)
                .multilineTextAlignment(.trailing)
                .frame(minWidth: 44, idealWidth: 56, maxWidth: 72)
                #if os(iOS)
                .keyboardType(.decimalPad)
                #endif

            if portions.isEmpty {
                Text("g")
                    .foregroundStyle(MonsColor.textSecondary)
                    .frame(minWidth: 44, minHeight: 44)
            } else {
                FoodPortionMenu(
                    amount: $amount,
                    selectedPortion: $selectedPortion,
                    portions: portions
                )
            }
        }
    }
}
