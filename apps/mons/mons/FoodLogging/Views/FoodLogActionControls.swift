import SwiftUI

struct FoodLogActionControls: View {
    let amount: Double
    let isEditing: Bool
    let isSaving: Bool
    let pendingItemCount: Int
    let onAdd: () -> Void
    let onLog: () -> Void

    var body: some View {
        HStack(spacing: MonsSpacing.small) {
            Button(action: onLog) {
                MonsAsyncActionLabel(
                    title: isEditing ? "Save Changes" : logTitle,
                    loadingTitle: isEditing ? "Saving…" : "Logging…",
                    systemImage: isEditing ? "checkmark" : "fork.knife",
                    isLoading: isSaving
                )
                .lineLimit(1)
                .minimumScaleFactor(0.8)
                .foregroundStyle(MonsColor.actionForeground)
                .frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(.glassProminent)
            .buttonBorderShape(.capsule)
            .tint(MonsColor.action)
            .disabled(amount <= 0 || isSaving)
            .accessibilityHint(isEditing ? "Updates this food log entry" : "Logs the selected serving now")

            if !isEditing {
                Button(action: onAdd) {
                    Text(addTitle)
                        .lineLimit(1)
                        .foregroundStyle(MonsColor.textPrimary)
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
                .buttonStyle(.glass)
                .buttonBorderShape(.capsule)
                .disabled(amount <= 0 || isSaving)
                .accessibilityHint("Adds the selected serving to the pending food list")
            }
        }
    }

    private var logTitle: String {
        pendingItemCount == 0 ? "Log Food" : "Log \(pendingItemCount + 1) Foods"
    }

    private var addTitle: String {
        pendingItemCount == 0 ? "Add to Meal" : "Add · \(pendingItemCount + 1) Items"
    }
}
