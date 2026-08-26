#if DEBUG && os(iOS)
import SwiftUI

struct MealComposerFoodDetailSheet: View {
    @Environment(\.dismiss) private var dismiss

    let food: CatalogFood
    let loggedAt: Date
    let onAddToMeal: (PendingFoodLogItem) -> Void
    let onLog: (PendingFoodLogItem) async -> Bool

    var body: some View {
        NavigationStack {
            FoodLogEditorView(
                food: food,
                loggedAt: loggedAt,
                pendingItemCount: 0,
                onAdd: onAddToMeal,
                onLog: onLog
            )
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

#Preview("Barcode food detail") {
    MealComposerFoodDetailSheet(
        food: MealComposerPrototypeFixtures.scannedFood(gtin: "00012345678905"),
        loggedAt: MealComposerPrototypeFixtures.loggedAt,
        onAddToMeal: { _ in },
        onLog: { _ in true }
    )
    .environment(AppStore.preview)
}
#endif
