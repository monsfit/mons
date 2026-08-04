import SwiftUI

struct FoodQuickAddBar: View {
    let onSearch: () -> Void
    let onScan: () -> Void

    var body: some View {
        HStack(spacing: 4) {
            Button(action: onSearch) {
                Label("Search for a food", systemImage: "magnifyingglass")
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .contentShape(.rect)
            }
            .buttonStyle(.plain)
            .frame(minHeight: 44)

            Button("Scan barcode", systemImage: "barcode.viewfinder", action: onScan)
                .labelStyle(.iconOnly)
                .frame(width: 44, height: 44)
                .contentShape(.rect)
                .buttonStyle(.plain)
        }
        .padding(.leading, 16)
        .padding(.trailing, 4)
        .padding(.vertical, 4)
        .glassEffect(.regular.interactive(), in: .capsule)
        .padding(.horizontal)
        .padding(.bottom, 6)
    }
}

#Preview {
    FoodQuickAddBar(onSearch: { }, onScan: { })
}
