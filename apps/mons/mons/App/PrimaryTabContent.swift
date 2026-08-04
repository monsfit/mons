import SwiftUI

struct PrimaryTabContent<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            #if os(iOS)
            .toolbar(.hidden, for: .tabBar)
            #endif
    }
}
