#if os(iOS)
import VisionKit

final class BarcodeScannerCoordinator: NSObject, DataScannerViewControllerDelegate {
    private let onScan: (String) -> Void

    init(onScan: @escaping (String) -> Void) {
        self.onScan = onScan
    }

    func dataScanner(
        _ dataScanner: DataScannerViewController,
        didAdd addedItems: [RecognizedItem],
        allItems: [RecognizedItem]
    ) {
        for item in addedItems {
            guard case .barcode(let barcode) = item, let value = barcode.payloadStringValue else {
                continue
            }
            onScan(value)
            dataScanner.stopScanning()
            return
        }
    }
}
#endif
