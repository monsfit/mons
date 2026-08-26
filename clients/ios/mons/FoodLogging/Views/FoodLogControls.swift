import SwiftUI

struct FoodLogControls: View {
    let amount: Double
    let isEditing: Bool
    let isSaving: Bool
    let pendingItemCount: Int
    let onAdd: () -> Void
    let onLog: () -> Void

    var body: some View {
        MonsBottomActionBar {
            FoodLogActionControls(
                amount: amount,
                isEditing: isEditing,
                isSaving: isSaving,
                pendingItemCount: pendingItemCount,
                onAdd: onAdd,
                onLog: onLog
            )
        }
    }
}

#Preview("Food log controls") {
    FoodLogControls(
        amount: 1,
        isEditing: false,
        isSaving: false,
        pendingItemCount: 0,
        onAdd: {},
        onLog: {}
    )
    .background(MonsColor.background)
}
