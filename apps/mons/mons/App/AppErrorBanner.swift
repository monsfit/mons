import SwiftUI

struct AppErrorBanner: View {
    let message: String
    let onDismiss: () -> Void

    var body: some View {
        HStack {
            Label(message, systemImage: "exclamationmark.triangle.fill")
                .foregroundStyle(.primary)

            Spacer()

            Button("Dismiss", systemImage: "xmark", action: onDismiss)
                .labelStyle(.iconOnly)
                .accessibilityLabel("Dismiss error")
        }
        .padding()
        .background(.regularMaterial)
    }
}
