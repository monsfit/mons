#if os(iOS)
@preconcurrency import AVFoundation
import UIKit

final class FoodCameraCaptureController: UIViewController, AVCapturePhotoCaptureDelegate {
    private let captureSession = AVCaptureSession()
    private let photoOutput = AVCapturePhotoOutput()
    private let sessionQueue = DispatchQueue(label: "com.jeremyscott.mons.camera-session")

    private var activeInput: AVCaptureDeviceInput?
    private var cameraDevice: UIImagePickerController.CameraDevice
    private var captureRequest: Int
    private var flashMode: UIImagePickerController.CameraFlashMode
    private let onCancel: () -> Void
    private let onCapture: (Data) -> Void

    private lazy var previewLayer: AVCaptureVideoPreviewLayer = {
        let layer = AVCaptureVideoPreviewLayer(session: captureSession)
        layer.videoGravity = .resizeAspectFill
        return layer
    }()

    init(
        captureRequest: Int,
        cameraDevice: UIImagePickerController.CameraDevice,
        flashMode: UIImagePickerController.CameraFlashMode,
        onCapture: @escaping (Data) -> Void,
        onCancel: @escaping () -> Void
    ) {
        self.captureRequest = captureRequest
        self.cameraDevice = cameraDevice
        self.flashMode = flashMode
        self.onCapture = onCapture
        self.onCancel = onCancel
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        view.layer.addSublayer(previewLayer)
        requestAccessAndStartSession()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        previewLayer.frame = view.bounds
        CATransaction.commit()
        updatePreviewRotation()
    }

    func update(
        captureRequest: Int,
        cameraDevice: UIImagePickerController.CameraDevice,
        flashMode: UIImagePickerController.CameraFlashMode
    ) {
        self.flashMode = flashMode

        if self.cameraDevice != cameraDevice {
            self.cameraDevice = cameraDevice
            configureInput(for: cameraDevice)
        }

        guard self.captureRequest != captureRequest else { return }
        self.captureRequest = captureRequest
        capturePhoto()
    }

    func stopSession() {
        let session = captureSession
        sessionQueue.async {
            guard session.isRunning else { return }
            session.stopRunning()
        }
    }

    private func requestAccessAndStartSession() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            configureAndStartSession()
        case .notDetermined:
            Task {
                let isGranted = await AVCaptureDevice.requestAccess(for: .video)
                guard !Task.isCancelled else { return }
                if isGranted {
                    configureAndStartSession()
                } else {
                    onCancel()
                }
            }
        case .denied, .restricted:
            onCancel()
        @unknown default:
            onCancel()
        }
    }

    private func configureAndStartSession() {
        captureSession.beginConfiguration()
        captureSession.sessionPreset = .photo
        if captureSession.canAddOutput(photoOutput) {
            captureSession.addOutput(photoOutput)
        }
        captureSession.commitConfiguration()

        configureInput(for: cameraDevice)

        let session = captureSession
        sessionQueue.async {
            guard !session.isRunning else { return }
            session.startRunning()
        }
    }

    private func configureInput(for cameraDevice: UIImagePickerController.CameraDevice) {
        let position: AVCaptureDevice.Position = cameraDevice == .front ? .front : .back
        guard let device = AVCaptureDevice.default(
            .builtInWideAngleCamera,
            for: .video,
            position: position
        ), let input = try? AVCaptureDeviceInput(device: device) else { return }

        captureSession.beginConfiguration()
        if let activeInput {
            captureSession.removeInput(activeInput)
        }

        if captureSession.canAddInput(input) {
            captureSession.addInput(input)
            activeInput = input
        }
        captureSession.commitConfiguration()
        updatePreviewRotation()
    }

    private func capturePhoto() {
        let settings = AVCapturePhotoSettings()
        let requestedFlashMode = avFlashMode
        if photoOutput.supportedFlashModes.contains(requestedFlashMode) {
            settings.flashMode = requestedFlashMode
        }
        photoOutput.capturePhoto(with: settings, delegate: self)
    }

    private var avFlashMode: AVCaptureDevice.FlashMode {
        switch flashMode {
        case .on:
            .on
        case .off:
            .off
        default:
            .auto
        }
    }

    private func updatePreviewRotation() {
        guard let connection = previewLayer.connection else { return }
        let angle: CGFloat = view.bounds.width > view.bounds.height ? 0 : 90
        guard connection.isVideoRotationAngleSupported(angle) else { return }
        connection.videoRotationAngle = angle
    }

    nonisolated func photoOutput(
        _ output: AVCapturePhotoOutput,
        didFinishProcessingPhoto photo: AVCapturePhoto,
        error: Error?
    ) {
        guard error == nil, let data = photo.fileDataRepresentation() else { return }
        Task { @MainActor [weak self] in
            self?.onCapture(data)
        }
    }
}
#endif
