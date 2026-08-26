import SwiftUI

public struct MonsSheetPresentationModifier: ViewModifier {
    public init() {}

    public func body(content: Content) -> some View {
        content
            .presentationDragIndicator(.visible)
            .presentationContentInteraction(.scrolls)
    }
}

extension View {
    public func monsSheetPresentation() -> some View {
        modifier(MonsSheetPresentationModifier())
    }
}
