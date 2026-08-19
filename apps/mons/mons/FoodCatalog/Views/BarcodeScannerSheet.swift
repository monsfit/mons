#if os(iOS)
import SwiftUI
import VisionKit

struct BarcodeScannerSheet: View {
    let cameraTransitionNamespace: Namespace.ID
    let animatesPresentation: Bool
    let onDismiss: () -> Void
    let onScan: (String) -> Void

    @State private var scannerError: String?

    init(
        cameraTransitionNamespace: Namespace.ID,
        animatesPresentation: Bool = true,
        onDismiss: @escaping () -> Void,
        onScan: @escaping (String) -> Void
    ) {
        self.cameraTransitionNamespace = cameraTransitionNamespace
        self.animatesPresentation = animatesPresentation
        self.onDismiss = onDismiss
        self.onScan = onScan
    }

    var body: some View {
        Group {
            if let scannerError {
                ContentUnavailableView(
                    "Scanner stopped",
                    systemImage: "camera.fill",
                    description: Text(scannerError)
                )
            } else if DataScannerViewController.isSupported && DataScannerViewController.isAvailable {
                BarcodeScannerView(onScan: finishScan) { message in
                    scannerError = message
                }
            } else {
                ContentUnavailableView(
                    "Scanner unavailable",
                    systemImage: "camera.fill",
                    description: Text("Enter the barcode manually instead.")
                )
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .foregroundStyle(.white)
        .background(.black)
        .overlay(alignment: .topLeading) {
            Text("Scan a barcode")
                .font(.headline)
                .foregroundStyle(.white)
                .padding()
        }
        .overlay(alignment: .bottomLeading) {
            Button(action: onDismiss) {
                Image(systemName: "chevron.left")
                    .font(.body.bold())
                    .foregroundStyle(.white)
                    .frame(width: 54, height: 54)
            }
            .buttonStyle(.plain)
            .glassEffect(.regular.interactive(), in: .circle)
            .accessibilityLabel("Close scanner")
            .padding()
        }
    }

    private func finishScan(_ value: String) {
        onScan(value)
    }
}
#endif
