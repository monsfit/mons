#if os(iOS)
import AVFoundation
import SwiftUI
import UIKit

struct FoodCameraCaptureView: UIViewControllerRepresentable {
    @Binding private var captureRequest: Int
    @Binding private var cameraDevice: UIImagePickerController.CameraDevice
    @Binding private var flashMode: UIImagePickerController.CameraFlashMode

    let onCapture: (Data) -> Void
    let onCancel: () -> Void

    static var isCameraAvailable: Bool {
        AVCaptureDevice.default(for: .video) != nil
    }

    init(
        captureRequest: Binding<Int> = .constant(0),
        cameraDevice: Binding<UIImagePickerController.CameraDevice> = .constant(.rear),
        flashMode: Binding<UIImagePickerController.CameraFlashMode> = .constant(.auto),
        onCapture: @escaping (Data) -> Void,
        onCancel: @escaping () -> Void
    ) {
        _captureRequest = captureRequest
        _cameraDevice = cameraDevice
        _flashMode = flashMode
        self.onCapture = onCapture
        self.onCancel = onCancel
    }

    func makeUIViewController(context: Context) -> FoodCameraCaptureController {
        FoodCameraCaptureController(
            captureRequest: captureRequest,
            cameraDevice: cameraDevice,
            flashMode: flashMode,
            onCapture: onCapture,
            onCancel: onCancel
        )
    }

    func updateUIViewController(_ controller: FoodCameraCaptureController, context: Context) {
        controller.update(
            captureRequest: captureRequest,
            cameraDevice: cameraDevice,
            flashMode: flashMode
        )
    }

    static func dismantleUIViewController(
        _ controller: FoodCameraCaptureController,
        coordinator: Void
    ) {
        controller.stopSession()
    }
}
#endif
