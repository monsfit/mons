#if os(iOS)
import SwiftUI
import UIKit

struct MealPhotoAnalysisFlowView: View {
    @Environment(AppStore.self) private var store

    let cameraTransitionNamespace: Namespace.ID
    let animatesCameraPresentation: Bool
    let loggedAt: Date
    let onDismiss: () -> Void
    let onLogged: () -> Void

    @State private var estimateId = UUID()
    @State private var phase: MealPhotoAnalysisPhase
    @State private var photoContext = ""
    @State private var cameraCaptureRequest = 0
    @State private var cameraDevice = UIImagePickerController.CameraDevice.rear
    @State private var cameraFlashMode = UIImagePickerController.CameraFlashMode.auto

    init(
        initialPhotoData: Data? = nil,
        cameraTransitionNamespace: Namespace.ID,
        animatesCameraPresentation: Bool = true,
        loggedAt: Date,
        onDismiss: @escaping () -> Void,
        onLogged: @escaping () -> Void
    ) {
        self.cameraTransitionNamespace = cameraTransitionNamespace
        self.animatesCameraPresentation = animatesCameraPresentation
        self.loggedAt = loggedAt
        self.onDismiss = onDismiss
        self.onLogged = onLogged
        _phase = State(initialValue: initialPhotoData.map(MealPhotoAnalysisPhase.context) ?? .capture)
    }

    var body: some View {
        Group {
            switch phase {
            case .capture:
                MealPhotoCaptureView(
                    captureRequest: $cameraCaptureRequest,
                    cameraDevice: $cameraDevice,
                    flashMode: $cameraFlashMode,
                    cameraTransitionNamespace: cameraTransitionNamespace,
                    animatesPresentation: animatesCameraPresentation,
                    onCapture: acceptPhoto,
                    onCancel: cancel,
                    onTakePhoto: takePhoto,
                    onFlipCamera: flipCamera
                )
            case .context(let data):
                analysisView(data: data, status: .ready)
            case .analyzing(let data):
                analysisView(data: data, status: .analyzing)
            case .failed(let data, let message):
                analysisView(data: data, status: .failed(message))
            case .review(let data, let estimate):
                MealEstimateReviewView(
                    estimate: estimate,
                    loggedAt: loggedAt,
                    photoData: data
                ) {
                    onLogged()
                    onDismiss()
                }
            }
        }
    }

    private func analysisView(data: Data, status: MealPhotoAnalysisStatus) -> some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: MonsSpacing.xLarge) {
                    MealReviewPhoto(data: data)
                        .padding(.horizontal, MonsSpacing.large)
                    switch status {
                    case .analyzing:
                        ProgressView("Analyzing your meal…")
                            .controlSize(.large)
                        Text("Matching each food to your nutrition database")
                            .foregroundStyle(MonsColor.textSecondary)
                    case .failed(let message):
                        ContentUnavailableView(
                            "Couldn’t Analyze Photo",
                            systemImage: "exclamationmark.triangle",
                            description: Text(message)
                        )
                        Button("Try Again", action: submitAnalysis)
                            .buttonStyle(MonsPrimaryButtonStyle())
                    case .ready:
                        VStack(alignment: .leading, spacing: MonsSpacing.small) {
                            Text("Add context")
                                .font(MonsTypography.headline)
                            Text("Optional details help with ingredients a photo can’t show, like milk, honey, oils, or portion size.")
                                .font(MonsTypography.caption)
                                .foregroundStyle(MonsColor.textSecondary)
                            TextField(
                                "Example: coffee with oat milk and 1 tsp honey",
                                text: $photoContext,
                                axis: .vertical
                            )
                            .lineLimit(2...4)
                            .textFieldStyle(.roundedBorder)
                        }
                        .padding(.horizontal, MonsSpacing.large)

                        Button("Analyze Meal", systemImage: "sparkles", action: submitAnalysis)
                            .buttonStyle(MonsPrimaryButtonStyle())
                            .padding(.horizontal, MonsSpacing.large)
                    }

                    if status != .analyzing {
                        Button("Retake Photo", action: retakePhoto)
                            .buttonStyle(MonsSecondaryButtonStyle())
                            .padding(.horizontal, MonsSpacing.large)
                    }
                    Spacer(minLength: MonsSpacing.large)
                }
                .padding(.top, MonsSpacing.large)
            }
            .background(MonsColor.background)
            .navigationTitle("Meal Photo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: cancel)
                }
            }
        }
    }

    private func acceptPhoto(_ data: Data) {
        Task {
            let normalized = await FoodImageData.normalizedJPEGInBackground(data) ?? data
            guard !Task.isCancelled else { return }
            phase = .context(normalized)
        }
    }

    private func takePhoto() {
        cameraCaptureRequest += 1
    }

    private func flipCamera() {
        let nextDevice: UIImagePickerController.CameraDevice = cameraDevice == .rear ? .front : .rear
        guard UIImagePickerController.isCameraDeviceAvailable(nextDevice) else { return }
        cameraDevice = nextDevice
    }

    private func submitAnalysis() {
        let data: Data
        switch phase {
        case .context(let captured), .failed(let captured, _):
            data = captured
        case .capture, .analyzing, .review:
            return
        }
        phase = .analyzing(data)
        Task {
            let estimate = await store.meals.estimate(
                .photo(data, context: photoContext, estimateId: estimateId)
            )
            if let estimate {
                phase = .review(data, estimate)
            } else {
                phase = .failed(data, "Try a clearer photo with the entire meal visible.")
            }
        }
    }

    private func retakePhoto() {
        Task { await store.meals.discardEstimate(estimateId) }
        estimateId = UUID()
        phase = .capture
        photoContext = ""
    }

    private func cancel() {
        if case .capture = phase {
            onDismiss()
        } else {
            Task { await store.meals.discardEstimate(estimateId) }
            onDismiss()
        }
    }
}
#endif
