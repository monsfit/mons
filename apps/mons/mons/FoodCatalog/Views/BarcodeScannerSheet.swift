#if os(iOS)
import SwiftUI
import VisionKit

struct BarcodeScannerSheet: View {
    let onScan: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var scannerError: String?

    var body: some View {
        NavigationStack {
            Group {
                if let scannerError {
                    ContentUnavailableView(
                        "Scanner stopped",
                        systemImage: "camera.fill",
                        description: Text(scannerError)
                    )
                } else if DataScannerViewController.isSupported && DataScannerViewController.isAvailable {
                    BarcodeScannerView(onScan: onScan) { message in
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
            .navigationTitle("Scan barcode")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: dismiss.callAsFunction)
                }
            }
        }
    }
}
#endif
