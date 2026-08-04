import SwiftUI

struct FoodSearchAccessory: View {
    let onSearch: () -> Void

    var body: some View {
        Button("Search for a food", systemImage: "magnifyingglass", action: onSearch)
            .font(MonsTypography.body)
            .foregroundStyle(MonsColor.textSecondary)
            .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
            .padding(.horizontal, MonsSpacing.large)
            .contentShape(.capsule)
            .buttonStyle(.plain)
            .accessibilityInputLabels(["Search food", "Find food"])
    }
}
