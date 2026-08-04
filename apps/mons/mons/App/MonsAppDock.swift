import SwiftUI

struct MonsAppDock: View {
    @Binding var selection: AppTab

    let onScan: () -> Void
    let onSearch: () -> Void

    var body: some View {
        GlassEffectContainer(spacing: MonsSpacing.small) {
            VStack(spacing: MonsSpacing.small) {
                FoodQuickAddBar(onSearch: onSearch, onScan: onScan)

                HStack(spacing: MonsSpacing.xSmall) {
                    ForEach(AppTab.allCases) { tab in
                        MonsAppDockTabButton(selection: $selection, tab: tab)
                    }
                }
                .padding(MonsSpacing.xSmall)
                .glassEffect(.regular.interactive(), in: .capsule)
            }
        }
        .padding(.horizontal)
        .padding(.bottom, MonsSpacing.xSmall)
    }
}
