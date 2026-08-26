import SwiftUI

struct AppToastPresenter: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let toast: AppToast?
    let onDismiss: (UUID) -> Void

    func body(content: Content) -> some View {
        content
            .overlay(alignment: .top) {
                if let toast {
                    AppToastView(toast: toast, onDismiss: { onDismiss(toast.id) })
                        .padding(.horizontal, MonsSpacing.large)
                        .padding(.top, MonsSpacing.small)
                        .transition(
                            reduceMotion
                                ? .opacity
                                : .move(edge: .top).combined(with: .opacity)
                        )
                        .zIndex(1)
                }
            }
            .animation(reduceMotion ? .easeOut(duration: 0.15) : .bouncy, value: toast?.id)
            .task(id: toast?.id) {
                guard let toast, let delay = toast.dismissalDelay else { return }
                do {
                    try await Task.sleep(for: .seconds(delay))
                    onDismiss(toast.id)
                } catch is CancellationError {
                    return
                } catch {
                    return
                }
            }
    }
}
