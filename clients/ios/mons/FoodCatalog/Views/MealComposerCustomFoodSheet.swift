#if DEBUG && os(iOS)
import SwiftUI

struct MealComposerCustomFoodSheet: View {
    @Environment(\.dismiss) private var dismiss

    let gtin: String

    var body: some View {
        NavigationStack {
            CustomFoodEditorView(barcode: gtin)
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
