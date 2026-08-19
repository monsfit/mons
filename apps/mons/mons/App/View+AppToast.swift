import SwiftUI

extension View {
    func appToast(_ toast: AppToast?, onDismiss: @escaping (UUID) -> Void) -> some View {
        modifier(AppToastPresenter(toast: toast, onDismiss: onDismiss))
    }
}
