#if os(iOS)
import SwiftUI
import UIKit

struct MealPhotoCaptureView: View {
    @Binding var captureRequest: Int
    @Binding var cameraDevice: UIImagePickerController.CameraDevice
    @Binding var flashMode: UIImagePickerController.CameraFlashMode

    let cameraTransitionNamespace: Namespace.ID
    let animatesPresentation: Bool
    let onCapture: (Data) -> Void
    let onCancel: () -> Void
    let onTakePhoto: () -> Void
    let onFlipCamera: () -> Void

    private var usesPreviewFixture: Bool {
        #if DEBUG
        let arguments = ProcessInfo.processInfo.arguments
        return arguments.contains("-cameraPOC") || arguments.contains("-cameraAutoDismissPOC")
        #else
        false
        #endif
    }

    private var showsCustomControls: Bool {
        FoodCameraCaptureView.isCameraAvailable || usesPreviewFixture
    }

    var body: some View {
        ZStack {
            Group {
                #if DEBUG
                if usesPreviewFixture {
                    FoodCameraPreviewFixture()
                } else {
                    FoodCameraCaptureView(
                        captureRequest: $captureRequest,
                        cameraDevice: $cameraDevice,
                        flashMode: $flashMode,
                        onCapture: onCapture,
                        onCancel: dismissCamera
                    )
                }
                #else
                FoodCameraCaptureView(
                    captureRequest: $captureRequest,
                    cameraDevice: $cameraDevice,
                    flashMode: $flashMode,
                    onCapture: onCapture,
                    onCancel: dismissCamera
                )
                #endif
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            if showsCustomControls {
                LinearGradient(
                    colors: [.clear, .black.opacity(0.12)],
                    startPoint: .center,
                    endPoint: .bottom
                )
                .allowsHitTesting(false)

                FoodCameraControlsOverlay(
                    flashMode: $flashMode,
                    onCancel: dismissCamera,
                    onCapture: onTakePhoto,
                    onFlipCamera: onFlipCamera
                )
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.black)
        .clipped()
        .task {
            await autoDismissForPOCIfNeeded()
        }
    }

    private func dismissCamera() {
        onCancel()
    }

    private func autoDismissForPOCIfNeeded() async {
        #if DEBUG
        guard ProcessInfo.processInfo.arguments.contains("-cameraAutoDismissPOC") else { return }
        try? await Task.sleep(for: .milliseconds(1_200))
        guard !Task.isCancelled else { return }
        dismissCamera()
        #endif
    }
}
#endif
