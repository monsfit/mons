import SwiftUI

struct MonsAppDockTabButton: View {
    @Binding var selection: AppTab

    let tab: AppTab

    private var isSelected: Bool {
        selection == tab
    }

    var body: some View {
        Button(action: select) {
            Image(systemName: tab.systemImage)
                .font(MonsTypography.headline)
                .foregroundStyle(isSelected ? MonsColor.actionForeground : MonsColor.textSecondary)
                .frame(width: 52, height: 52)
                .background(isSelected ? MonsColor.action : .clear, in: .circle)
                .contentShape(.circle)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(tab.title)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private func select() {
        withAnimation(.snappy(duration: 0.22)) {
            selection = tab
        }
    }
}
