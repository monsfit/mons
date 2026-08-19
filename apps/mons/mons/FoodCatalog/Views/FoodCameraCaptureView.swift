#if os(iOS)
import SwiftUI
import UIKit

struct FoodCameraCaptureView: UIViewControllerRepresentable {
    @Binding private var captureRequest: Int
    @Binding private var cameraDevice: UIImagePickerController.CameraDevice
    @Binding private var flashMode: UIImagePickerController.CameraFlashMode

    let usesCustomControls: Bool
    let onCapture: (Data) -> Void
    let onCancel: () -> Void

    static var isCameraAvailable: Bool {
        UIImagePickerController.isSourceTypeAvailable(.camera)
    }

    init(
        captureRequest: Binding<Int> = .constant(0),
        cameraDevice: Binding<UIImagePickerController.CameraDevice> = .constant(.rear),
        flashMode: Binding<UIImagePickerController.CameraFlashMode> = .constant(.auto),
        usesCustomControls: Bool = false,
        onCapture: @escaping (Data) -> Void,
        onCancel: @escaping () -> Void
    ) {
        _captureRequest = captureRequest
        _cameraDevice = cameraDevice
        _flashMode = flashMode
        self.usesCustomControls = usesCustomControls
        self.onCapture = onCapture
        self.onCancel = onCancel
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(
            captureRequest: captureRequest,
            onCapture: onCapture,
            onCancel: onCancel
        )
    }

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        if Self.isCameraAvailable {
            picker.sourceType = .camera
            picker.cameraCaptureMode = .photo
            picker.showsCameraControls = !usesCustomControls
            updateCameraConfiguration(picker)
        } else {
            picker.sourceType = .photoLibrary
        }
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ controller: UIImagePickerController, context: Context) {
        guard controller.sourceType == .camera else { return }

        updateCameraConfiguration(controller)
        guard context.coordinator.captureRequest != captureRequest else { return }
        context.coordinator.captureRequest = captureRequest
        controller.takePicture()
    }

    private func updateCameraConfiguration(_ picker: UIImagePickerController) {
        if picker.cameraDevice != cameraDevice,
           UIImagePickerController.isCameraDeviceAvailable(cameraDevice) {
            picker.cameraDevice = cameraDevice
        }

        if UIImagePickerController.isFlashAvailable(for: picker.cameraDevice) {
            picker.cameraFlashMode = flashMode
        }
    }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        var captureRequest: Int

        private let onCapture: (Data) -> Void
        private let onCancel: () -> Void

        init(
            captureRequest: Int,
            onCapture: @escaping (Data) -> Void,
            onCancel: @escaping () -> Void
        ) {
            self.captureRequest = captureRequest
            self.onCapture = onCapture
            self.onCancel = onCancel
        }

        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            if let image = info[.originalImage] as? UIImage,
               let data = image.jpegData(compressionQuality: 0.9) {
                onCapture(data)
            }
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            onCancel()
        }
    }
}
#endif
