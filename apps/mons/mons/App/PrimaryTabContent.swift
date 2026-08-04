import SwiftUI

struct PrimaryTabContent<Content: View>: View {
    let content: Content
    let onScan: () -> Void
    let onSearch: () -> Void

    init(
        onScan: @escaping () -> Void,
        onSearch: @escaping () -> Void,
        @ViewBuilder content: () -> Content
    ) {
        self.content = content()
        self.onScan = onScan
        self.onSearch = onSearch
    }

    var body: some View {
        content
            .overlay(alignment: .bottomTrailing) {
                FoodQuickActionMenu(onScan: onScan, onSearch: onSearch)
                    .padding(MonsSpacing.large)
            }
    }
}
