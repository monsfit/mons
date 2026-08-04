import SwiftUI

struct MonsAppDock: View {
    @Binding var selection: AppTab

    let onScan: () -> Void
    let onSearch: () -> Void

    var body: some View {
        GlassEffectContainer(spacing: MonsSpacing.small) {
            HStack(spacing: MonsSpacing.small) {
                HStack(spacing: MonsSpacing.xSmall) {
                    ForEach(AppTab.allCases) { tab in
                        MonsAppDockTabButton(selection: $selection, tab: tab)
                    }
                }
                .padding(MonsSpacing.xSmall)
                .glassEffect(.regular.interactive(), in: .capsule)

                Button("Search foods", systemImage: "magnifyingglass", action: onSearch)
                    .labelStyle(.iconOnly)
                    .font(MonsTypography.headline)
                    .foregroundStyle(MonsColor.textPrimary)
                    .frame(width: 52, height: 52)
                    .contentShape(.circle)
                    .buttonStyle(.plain)
                    .glassEffect(.regular.interactive(), in: .circle)

                FoodQuickActionMenu(onScan: onScan, onSearch: onSearch)
            }
        }
        .padding(.horizontal, MonsSpacing.large)
        .padding(.bottom, MonsSpacing.xSmall)
    }
}
