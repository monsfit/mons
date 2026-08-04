import SwiftUI

struct FoodCatalogSearchBar: View {
    @Binding var searchText: String
    let onScan: () -> Void

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(MonsColor.textSecondary)
                .accessibilityHidden(true)

            TextField("Search for a food", text: $searchText)
                .font(MonsTypography.body)
                .textFieldStyle(.plain)

            Button("Scan barcode", systemImage: "barcode.viewfinder", action: onScan)
                .labelStyle(.iconOnly)
                .frame(width: 44, height: 44)
                .contentShape(.rect)
                .buttonStyle(.plain)
        }
        .padding(.leading, 16)
        .padding(.trailing, 4)
        .frame(minHeight: 52)
        .glassEffect(.regular.interactive(), in: .capsule)
        .tint(MonsColor.textPrimary)
        .padding(.horizontal)
        .padding(.vertical, 8)
    }
}
