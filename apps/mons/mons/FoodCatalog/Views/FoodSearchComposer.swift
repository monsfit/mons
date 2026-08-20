#if os(iOS)
import PhotosUI
import SwiftUI

struct FoodSearchComposer<CameraContent: View>: View {
    @Environment(\.accessibilityReduceMotion) private var accessibilityReduceMotion

    @Binding var searchText: String
    @Binding var selectedPhoto: PhotosPickerItem?
    @Binding var isMenuExpanded: Bool

    let cameraTransitionNamespace: Namespace.ID
    let isCameraPresented: Bool
    let onBarcode: () -> Void
    let onCamera: () -> Void
    let onPaste: () -> Void
    let onVoiceCapture: (Data) async -> Void
    var onReview: (() -> Void)? = nil
    var onSearch: (() -> Void)? = nil
    var searchPrompt = "Search foods or meals"
    @ViewBuilder let cameraContent: () -> CameraContent

    @FocusState private var isSearchFocused: Bool
    @State private var isProcessingVoice = false
    @State private var recorder = MealVoiceRecorder()
    @State private var voiceTask: Task<Void, Never>?

    var body: some View {
        GlassEffectContainer(spacing: MonsSpacing.xSmall) {
            GeometryReader { proxy in
                ZStack(alignment: .bottomLeading) {
                    if surfacePhase != .camera {
                        inputBar
                            .transition(.opacity)
                    }

                    if surfacePhase == .menu {
                        Color.clear
                            .contentShape(Rectangle())
                            .onTapGesture(perform: closeMenu)
                            .zIndex(0.5)
                    }

                    ZStack {
                        switch surfacePhase {
                        case .button:
                            Button("Add meal input", systemImage: "plus", action: toggleMenu)
                                .labelStyle(.iconOnly)
                                .font(.title3)
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                                .accessibilityHint("Shows camera, barcode, photo, and paste options")
                                .transition(.opacity)
                        case .menu:
                            FoodSearchComposerMenu(
                                selectedPhoto: $selectedPhoto,
                                onBarcode: presentBarcodeCamera,
                                onCamera: presentMealCamera,
                                onPaste: pasteDescription
                            )
                            .transition(.opacity)
                        case .camera:
                            cameraContent()
                                .transition(.opacity)
                        }
                    }
                    .frame(
                        width: surfaceWidth(availableWidth: proxy.size.width),
                        height: surfaceHeight(availableHeight: proxy.size.height),
                        alignment: .bottomLeading
                    )
                    .background(surfaceBackground)
                    .clipShape(surfaceShape)
                    .glassEffect(
                        surfaceGlass,
                        in: surfaceShape
                    )
                    .offset(
                        x: surfacePhase == .button ? MonsSpacing.xSmall : 0,
                        y: surfacePhase == .button ? -MonsSpacing.small : 0
                    )
                    .zIndex(1)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
            }
        }
        .padding(.horizontal, MonsSpacing.large)
        .padding(.vertical, MonsSpacing.small)
        .onChange(of: selectedPhoto) { _, newValue in
            if newValue != nil {
                setMenuExpanded(false)
            }
        }
        .onDisappear(perform: cancelVoiceWork)
    }

    private var inputBar: some View {
        HStack(spacing: MonsSpacing.xSmall) {
            Color.clear
                .frame(width: 44, height: 52)

            Group {
                if recorder.isRecording {
                    FoodSearchInlineVoiceStatus(
                        elapsedTime: recorder.elapsedTime,
                        levels: recorder.levels
                    )
                    .transition(.blurReplace)
                } else if isProcessingVoice {
                    HStack(spacing: MonsSpacing.small) {
                        ProgressView()
                            .controlSize(.small)

                        Text("Analyzing voice…")
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .transition(.blurReplace)
                } else {
                    if let onSearch {
                        Button(action: onSearch) {
                            Text(searchText.isEmpty ? searchPrompt : searchText)
                                .foregroundStyle(searchText.isEmpty ? .secondary : .primary)
                                .lineLimit(1)
                                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityHint("Opens exact food search")
                        .transition(.blurReplace)
                    } else {
                        TextField(searchPrompt, text: $searchText)
                            .focused($isSearchFocused)
                            .submitLabel(.search)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .transition(.blurReplace)
                    }
                }
            }
            .animation(.smooth(duration: 0.2), value: recorder.isRecording)
            .animation(.smooth(duration: 0.2), value: isProcessingVoice)

            Button(action: toggleVoiceRecording) {
                Image(systemName: recorder.isRecording ? "stop.fill" : "mic.fill")
                    .contentTransition(.symbolEffect(.replace))
                    .foregroundStyle(recorder.isRecording ? Color.white : Color.secondary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .labelStyle(.iconOnly)
            .font(.title2)
            .frame(width: onReview == nil ? 68 : 52, height: 52)
            .buttonStyle(.plain)
            .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 22))
            .tint(recorder.isRecording ? .red : nil)
            .disabled(isProcessingVoice)
            .accessibilityLabel(recorder.isRecording ? "Stop recording" : "Describe meal by voice")

            if let onReview {
                Button(action: onReview) {
                    Image(systemName: "arrow.up")
                        .font(.title3.bold())
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                .labelStyle(.iconOnly)
                .frame(width: 52, height: 52)
                .buttonStyle(.plain)
                .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 22))
                .accessibilityLabel("Review meal")
            }
        }
        .padding(MonsSpacing.xSmall)
        .frame(minHeight: 60)
        .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 26))
        .allowsHitTesting(surfacePhase == .button)
    }

    private var surfacePhase: SurfacePhase {
        if isCameraPresented { return .camera }
        if isMenuExpanded { return .menu }
        return .button
    }

    private var surfaceCornerRadius: CGFloat {
        switch surfacePhase {
        case .button: 22
        case .menu: 30
        case .camera: 38
        }
    }

    private var surfaceShape: RoundedRectangle {
        RoundedRectangle(cornerRadius: surfaceCornerRadius)
    }

    private var surfaceGlass: Glass {
        switch surfacePhase {
        case .button, .menu:
            .regular.interactive()
        case .camera:
            .identity
        }
    }

    private var surfaceBackground: some View {
        Group {
            switch surfacePhase {
            case .button:
                Color.clear
            case .menu:
                Color(uiColor: .systemBackground).opacity(0.82)
            case .camera:
                Color.black
            }
        }
    }

    private func surfaceWidth(availableWidth: CGFloat) -> CGFloat {
        switch surfacePhase {
        case .button: 44
        case .menu: availableWidth * 0.75
        case .camera: availableWidth
        }
    }

    private func surfaceHeight(availableHeight: CGFloat) -> CGFloat {
        switch surfacePhase {
        case .button: 44
        case .menu: 296
        case .camera: availableHeight * 0.58
        }
    }

    private func toggleMenu() {
        isSearchFocused = false
        setMenuExpanded(!isMenuExpanded)
    }

    private func closeMenu() {
        setMenuExpanded(false)
    }

    private func presentBarcodeCamera() {
        isSearchFocused = false
        performCameraTransition {
            isMenuExpanded = false
            onBarcode()
        }
    }

    private func presentMealCamera() {
        isSearchFocused = false
        performCameraTransition {
            isMenuExpanded = false
            onCamera()
        }
    }

    private func pasteDescription() {
        setMenuExpanded(false)
        onPaste()
    }

    private func setMenuExpanded(_ expanded: Bool) {
        if accessibilityReduceMotion {
            isMenuExpanded = expanded
        } else {
            withAnimation(.smooth(duration: 0.3, extraBounce: 0.02)) {
                isMenuExpanded = expanded
            }
        }
    }

    private func performCameraTransition(_ action: () -> Void) {
        if accessibilityReduceMotion {
            action()
        } else {
            withAnimation(.smooth(duration: 0.46, extraBounce: 0)) {
                action()
            }
        }
    }

    private func toggleVoiceRecording() {
        if recorder.isRecording {
            stopAndAnalyzeVoice()
        } else {
            startVoiceRecording()
        }
    }

    private func startVoiceRecording() {
        isSearchFocused = false
        voiceTask?.cancel()
        voiceTask = Task { @MainActor in
            do {
                try await recorder.start()
            } catch {
                isProcessingVoice = false
            }
        }
    }

    private func stopAndAnalyzeVoice() {
        do {
            let data = try recorder.stop()
            isProcessingVoice = true
            voiceTask = Task { @MainActor in
                await onVoiceCapture(data)
                guard !Task.isCancelled else { return }
                isProcessingVoice = false
                voiceTask = nil
            }
        } catch {
            isProcessingVoice = false
        }
    }

    private func cancelVoiceWork() {
        recorder.cancel()
        voiceTask?.cancel()
        voiceTask = nil
        isProcessingVoice = false
    }

    private enum SurfacePhase: Equatable {
        case button
        case menu
        case camera
    }
}
#endif
