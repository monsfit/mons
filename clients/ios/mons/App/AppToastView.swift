import SwiftUI

struct AppToastView: View {
    let toast: AppToast
    let onDismiss: () -> Void

    var body: some View {
        HStack(spacing: MonsSpacing.medium) {
            Image(systemName: toast.kind == .success ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                .foregroundStyle(toast.kind == .error ? MonsColor.error : MonsColor.textPrimary)
                .accessibilityHidden(true)

            Text(toast.message)
                .font(MonsTypography.headline)
                .foregroundStyle(MonsColor.textPrimary)
                .fixedSize(horizontal: false, vertical: true)

            if toast.kind == .error {
                Button("Dismiss error", systemImage: "xmark", action: onDismiss)
                    .labelStyle(.iconOnly)
                    .foregroundStyle(MonsColor.textSecondary)
                    .frame(width: 44, height: 44)
            }
        }
        .padding(.leading, MonsSpacing.large)
        .padding(.trailing, toast.kind == .error ? MonsSpacing.small : MonsSpacing.large)
        .padding(.vertical, MonsSpacing.small)
        .frame(minHeight: 52)
        .glassEffect(
            .regular.tint(toast.kind == .error ? MonsColor.errorSurface : nil),
            in: .capsule
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel(toast.message)
        .accessibilityValue(accessibilityValue)
    }

    private var accessibilityValue: String {
        switch toast.kind {
        case .error:
            "Error"
        case .success:
            "Success"
        }
    }
}

#Preview("Toast states") {
    VStack(spacing: MonsSpacing.large) {
        AppToastView(toast: AppToast(kind: .success, message: "Template saved"), onDismiss: {})
        AppToastView(
            toast: AppToast(kind: .error, message: "The template could not be saved."),
            onDismiss: {}
        )
    }
    .padding()
    .background(MonsColor.background)
}
