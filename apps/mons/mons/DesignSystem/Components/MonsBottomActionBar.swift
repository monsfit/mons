import SwiftUI

struct MonsBottomActionBar<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        VStack(spacing: 0) {
            Divider()
                .overlay(MonsColor.border)

            content
                .padding(.horizontal, MonsSpacing.medium)
                .padding(.vertical, MonsSpacing.small)
        }
        .background(.bar)
    }
}
