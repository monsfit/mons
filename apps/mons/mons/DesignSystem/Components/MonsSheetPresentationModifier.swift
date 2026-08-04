import SwiftUI

public struct MonsSheetPresentationModifier: ViewModifier {
    public init() {}

    public func body(content: Content) -> some View {
        content
            .presentationBackground(.thinMaterial)
            .presentationCornerRadius(MonsRadius.large)
    }
}

extension View {
    public func monsSheetPresentation() -> some View {
        modifier(MonsSheetPresentationModifier())
    }
}
