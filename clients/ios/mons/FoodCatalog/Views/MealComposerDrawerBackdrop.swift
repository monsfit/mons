#if DEBUG && os(iOS)
import SwiftUI

struct MealComposerDrawerBackdrop: View {
    let isPresented: Bool
    let opacityProgress: Double
    let onDismiss: () -> Void

    var body: some View {
        Button(action: onDismiss) {
            Color.black
                .opacity(isPresented ? 0.055 * opacityProgress : 0)
                .ignoresSafeArea()
                .contentShape(Rectangle())
        }
            .buttonStyle(.plain)
            .allowsHitTesting(isPresented)
            .accessibilityLabel("Close meal drawer")
    }
}
#endif
