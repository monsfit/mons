import SwiftUI

struct MonsCard<Content: View>: View {
    let isRaised: Bool
    let content: Content

    init(isRaised: Bool = false, @ViewBuilder content: () -> Content) {
        self.isRaised = isRaised
        self.content = content()
    }

    var body: some View {
        content
            .padding(MonsSpacing.large)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(isRaised ? MonsColor.surfaceRaised : MonsColor.surface)
            .clipShape(.rect(cornerRadius: MonsRadius.large))
            .overlay {
                RoundedRectangle(cornerRadius: MonsRadius.large)
                    .stroke(MonsColor.border, lineWidth: 1)
            }
    }
}
