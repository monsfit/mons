import SwiftUI

struct FoodLogControls: View {
    @Binding var amount: Double
    @Binding var selectedPortion: FoodPortion?

    let portions: [FoodPortion]
    let isSaving: Bool
    let pendingItemCount: Int
    let onAdd: () -> Void
    let onLog: () -> Void

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: MonsSpacing.small) {
                FoodLogQuantityControls(
                    amount: $amount,
                    selectedPortion: $selectedPortion,
                    portions: portions
                )
                .frame(maxWidth: 160)

                FoodLogActionControls(
                    amount: amount,
                    expands: false,
                    isSaving: isSaving,
                    pendingItemCount: pendingItemCount,
                    onAdd: onAdd,
                    onLog: onLog
                )
            }

            VStack(spacing: MonsSpacing.small) {
                FoodLogQuantityControls(
                    amount: $amount,
                    selectedPortion: $selectedPortion,
                    portions: portions
                )

                FoodLogActionControls(
                    amount: amount,
                    expands: true,
                    isSaving: isSaving,
                    pendingItemCount: pendingItemCount,
                    onAdd: onAdd,
                    onLog: onLog
                )
            }
        }
        .padding(MonsSpacing.small)
        .glassEffect(.regular, in: .rect(cornerRadius: MonsRadius.medium))
        .padding(.horizontal)
        .padding(.vertical, MonsSpacing.small)
    }
}
