#if DEBUG && os(iOS)
import SwiftUI
import UIKit

struct MealComposerCameraSurface: View {
    let destination: MealComposerCameraDestination
    let cameraTransitionNamespace: Namespace.ID
    let usesFixture: Bool
    let onDismiss: () -> Void
    let onBarcode: (String) -> Void
    let onPhoto: (Data?) -> Void

    @State private var captureRequest = 0
    @State private var cameraDevice = UIImagePickerController.CameraDevice.rear
    @State private var flashMode = UIImagePickerController.CameraFlashMode.auto

    var body: some View {
        Group {
            switch destination {
            case .barcode:
                if usesFixture {
                    MealComposerBarcodeScannerFixture(
                        onDismiss: onDismiss,
                        onScan: onBarcode
                    )
                } else {
                    BarcodeScannerSheet(
                        cameraTransitionNamespace: cameraTransitionNamespace,
                        onDismiss: onDismiss,
                        onScan: onBarcode
                    )
                }
            case .meal:
                if usesFixture {
                    FoodCameraPreviewFixture()
                        .overlay(alignment: .bottom) {
                            Button("Take photo", action: captureFixtureImage)
                                .labelStyle(.iconOnly)
                                .frame(width: 70, height: 70)
                                .background(.white, in: Circle())
                                .overlay {
                                    Circle()
                                        .stroke(.white.opacity(0.92), lineWidth: 4)
                                        .padding(-7)
                                }
                                .buttonStyle(.plain)
                                .padding(.bottom, MonsSpacing.xLarge)
                        }
                        .overlay(alignment: .bottomLeading) {
                            cameraBackButton
                        }
                } else {
                    MealPhotoCaptureView(
                        captureRequest: $captureRequest,
                        cameraDevice: $cameraDevice,
                        flashMode: $flashMode,
                        cameraTransitionNamespace: cameraTransitionNamespace,
                        animatesPresentation: true,
                        onCapture: acceptCapturedPhoto,
                        onCancel: onDismiss,
                        onTakePhoto: takePhoto,
                        onFlipCamera: flipCamera
                    )
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipped()
    }

    private var cameraBackButton: some View {
        Button("Close camera", systemImage: "chevron.left", action: onDismiss)
            .labelStyle(.iconOnly)
            .font(.body.bold())
            .foregroundStyle(.white)
            .frame(width: 54, height: 54)
            .buttonStyle(.plain)
            .glassEffect(.regular.interactive(), in: .circle)
            .padding(MonsSpacing.large)
    }

    private func acceptCapturedPhoto(_ data: Data) {
        guard !data.isEmpty else { return }
        Task { @MainActor in
            let normalized = await FoodImageData.normalizedJPEGInBackground(data) ?? data
            guard !Task.isCancelled else { return }
            onPhoto(normalized)
            onDismiss()
        }
    }

    private func captureFixtureImage() {
        onPhoto(nil)
        onDismiss()
    }

    private func takePhoto() {
        captureRequest += 1
    }

    private func flipCamera() {
        let nextDevice: UIImagePickerController.CameraDevice = cameraDevice == .rear ? .front : .rear
        guard UIImagePickerController.isCameraDeviceAvailable(nextDevice) else { return }
        cameraDevice = nextDevice
    }
}
#endif
