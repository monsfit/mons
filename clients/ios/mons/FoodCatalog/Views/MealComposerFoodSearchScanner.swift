#if DEBUG && os(iOS)
import SwiftUI
import VisionKit

struct MealComposerFoodSearchScanner: View {
    let usesFixture: Bool
    let onScan: (String) -> Void

    @State private var scannerError: String?

    var body: some View {
        ZStack {
            scannerContent
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .clipped()

            RoundedRectangle(cornerRadius: 18)
                .stroke(.white, lineWidth: 3)
                .frame(maxWidth: 290, maxHeight: 170)
                .padding(MonsSpacing.xLarge)
                .accessibilityHidden(true)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .overlay(alignment: .top) {
            Label("Center the barcode in the frame", systemImage: "barcode.viewfinder")
                .font(.subheadline)
                .foregroundStyle(.white)
                .padding(.horizontal, MonsSpacing.medium)
                .frame(minHeight: 44)
                .glassEffect(.regular, in: .capsule)
                .padding(MonsSpacing.large)
        }
        .overlay(alignment: .bottom) {
            if usesFixture {
                Button("Use Demo Barcode", systemImage: "barcode", action: scanFixture)
                    .buttonStyle(.glassProminent)
                    .padding(MonsSpacing.large)
            }
        }
        .background(.black)
        .clipped()
    }

    @ViewBuilder
    private var scannerContent: some View {
        if usesFixture {
            FoodCameraPreviewFixture()
        } else if let scannerError {
            ContentUnavailableView(
                "Scanner stopped",
                systemImage: "camera.fill",
                description: Text(scannerError)
            )
            .foregroundStyle(.white)
        } else if DataScannerViewController.isSupported && DataScannerViewController.isAvailable {
            BarcodeScannerView(onScan: onScan) { message in
                scannerError = message
            }
        } else {
            ContentUnavailableView(
                "Scanner unavailable",
                systemImage: "camera.fill",
                description: Text("Use Quick Add to enter the barcode manually.")
            )
            .foregroundStyle(.white)
        }
    }

    private func scanFixture() {
        onScan("012345678905")
    }
}

#Preview("Food sheet scanner") {
    MealComposerFoodSearchScanner(usesFixture: true, onScan: { _ in })
        .frame(height: 560)
}
#endif
