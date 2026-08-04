import SwiftUI

struct FoodQuickActionMenu: View {
    let onScan: () -> Void
    let onSearch: () -> Void

    var body: some View {
        Menu {
            Button("Search foods", systemImage: "magnifyingglass", action: onSearch)
            Button("Scan barcode", systemImage: "barcode.viewfinder", action: onScan)
        } label: {
            Label("Quick food actions", systemImage: "plus")
                .labelStyle(.iconOnly)
                .font(MonsTypography.headline)
                .foregroundStyle(MonsColor.textPrimary)
                .frame(width: 52, height: 52)
                .contentShape(.circle)
        }
        .buttonStyle(.plain)
        .glassEffect(.regular.interactive(), in: .circle)
        .accessibilityInputLabels(["Quick food actions", "Add food"])
    }
}
