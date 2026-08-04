import SwiftUI

struct MonsAppDockTabButton: View {
    @Binding var selection: AppTab

    let tab: AppTab

    private var isSelected: Bool { selection == tab }

    var body: some View {
        Button(action: select) {
            VStack(spacing: MonsSpacing.xSmall) {
                Image(systemName: tab.systemImage)
                    .font(MonsTypography.headline)

                Text(tab.title)
                    .font(MonsTypography.caption)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .foregroundStyle(isSelected ? MonsColor.textPrimary : MonsColor.textSecondary)
            .frame(maxWidth: .infinity, minHeight: 54)
            .contentShape(.capsule)
        }
        .buttonStyle(.plain)
        .background(isSelected ? MonsColor.action.opacity(0.1) : .clear, in: .capsule)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private func select() {
        withAnimation(.snappy(duration: 0.22)) {
            selection = tab
        }
    }
}
