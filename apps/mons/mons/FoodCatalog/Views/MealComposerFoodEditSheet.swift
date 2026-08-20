#if DEBUG && os(iOS)
import SwiftUI

struct MealComposerFoodEditSheet: View {
    @Environment(\.dismiss) private var dismiss

    let item: PendingFoodLogItem
    let onSave: (PendingFoodLogItem) async -> Bool

    var body: some View {
        NavigationStack {
            FoodLogEditorView(item: item, onSave: onSave)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Close", action: dismiss.callAsFunction)
                    }
                }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }
}
#endif
