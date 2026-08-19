import SwiftUI

public struct MonsGroupedContentModifier: ViewModifier {
    public init() {}

    public func body(content: Content) -> some View {
        #if os(iOS)
        content
            .listStyle(.insetGrouped)
        #else
        content
        #endif
    }
}

extension View {
    public func monsGroupedContent() -> some View {
        modifier(MonsGroupedContentModifier())
    }
}
