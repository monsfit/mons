import SwiftUI

struct MonsSheetPresentationModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .presentationBackground(.thinMaterial)
            .presentationCornerRadius(MonsRadius.large)
    }
}

extension View {
    func monsSheetPresentation() -> some View {
        modifier(MonsSheetPresentationModifier())
    }
}
