#if os(iOS)
import SwiftUI
import Vision
import VisionKit

struct BarcodeScannerView: UIViewControllerRepresentable {
    let onScan: (String) -> Void
    let onError: (String) -> Void

    func makeCoordinator() -> BarcodeScannerCoordinator {
        BarcodeScannerCoordinator(onScan: onScan)
    }

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let scanner = DataScannerViewController(
            recognizedDataTypes: [.barcode(symbologies: [.ean8, .ean13, .itf14])],
            qualityLevel: .balanced,
            recognizesMultipleItems: false,
            isHighFrameRateTrackingEnabled: false,
            isPinchToZoomEnabled: true,
            isGuidanceEnabled: true,
            isHighlightingEnabled: true
        )
        scanner.delegate = context.coordinator
        return scanner
    }

    func updateUIViewController(_ scanner: DataScannerViewController, context: Context) {
        guard !scanner.isScanning else { return }
        do {
            try scanner.startScanning()
        } catch {
            Task { @MainActor in
                onError(error.localizedDescription)
            }
        }
    }

    static func dismantleUIViewController(
        _ scanner: DataScannerViewController,
        coordinator: BarcodeScannerCoordinator
    ) {
        scanner.stopScanning()
    }

}
#endif
