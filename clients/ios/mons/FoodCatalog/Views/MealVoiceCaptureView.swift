#if os(iOS)
import SwiftUI

struct MealVoiceCaptureView: View {
    @Environment(\.dismiss) private var dismiss

    let onCapture: (Data) async -> MealEstimate?
    let onComplete: (MealEstimate) -> Void

    @State private var capturedAudio: Data?
    @State private var phase = MealVoiceCapturePhase.ready
    @State private var recorder = MealVoiceRecorder()
    @State private var submissionTask: Task<Void, Never>?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    MealVoiceTransportView(
                        elapsedTime: recorder.elapsedTime,
                        levels: recorder.levels,
                        isRecording: isRecording,
                        isProcessing: isTranscribing,
                        hasRecording: capturedAudio != nil,
                        onDiscard: discardRecording,
                        onRecord: startRecording,
                        onRetry: retryTranscription,
                        onStop: stopAndTranscribe
                    )
                } header: {
                    Label(statusTitle, systemImage: statusSystemImage)
                } footer: {
                    Text(statusDescription)
                }

                if let errorMessage {
                    Section("Couldn’t finish") {
                        Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(MonsColor.error)
                    }
                }

                if let estimate {
                    Section("Transcript") {
                        Text(estimate.transcript ?? estimate.description)
                            .textSelection(.enabled)
                    }

                    Section {
                        Button("Review Foods", systemImage: "list.bullet.clipboard") {
                            finish(with: estimate)
                        }
                        Button("Record Again", systemImage: "arrow.counterclockwise", action: startRecording)
                    }
                }
            }
            .monsGroupedContent()
            .foregroundStyle(MonsColor.textPrimary)
            .navigationTitle("Voice Log")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: cancel)
                }
            }
            .interactiveDismissDisabled(isCapturing)
        }
        .monsSheetPresentation()
        .onDisappear(perform: cancelWork)
    }

    private var isRecording: Bool {
        if case .recording = phase { true } else { false }
    }

    private var isTranscribing: Bool {
        if case .transcribing = phase { true } else { false }
    }

    private var estimate: MealEstimate? {
        if case .transcribed(let estimate) = phase { estimate } else { nil }
    }

    private var errorMessage: String? {
        if case .failed(let message) = phase { message } else { nil }
    }

    private var statusTitle: String {
        switch phase {
        case .ready: "Describe your meal"
        case .recording: "Recording"
        case .transcribing: "Analyzing recording"
        case .transcribed: "Recording analyzed"
        case .failed: capturedAudio == nil ? "Recording unavailable" : "Recording saved"
        }
    }

    private var statusDescription: String {
        switch phase {
        case .ready:
            "Mention foods, portions, drinks, and preparation details."
        case .recording:
            "Speak naturally, then tap stop when you’re done."
        case .transcribing:
            "Transcribing your voice and matching foods from the catalog."
        case .transcribed:
            "Review the transcript, then continue to the editable food list."
        case .failed:
            capturedAudio == nil
                ? "Check microphone access, then try recording again."
                : "Retry the saved recording or discard it and record again."
        }
    }

    private var statusSystemImage: String {
        switch phase {
        case .ready: "mic"
        case .recording: "record.circle.fill"
        case .transcribing: "waveform.badge.magnifyingglass"
        case .transcribed: "checkmark.circle.fill"
        case .failed: "arrow.clockwise"
        }
    }

    private var isCapturing: Bool {
        switch phase {
        case .recording, .transcribing:
            true
        case .failed, .ready, .transcribed:
            false
        }
    }

    private func startRecording() {
        cancelWork()
        capturedAudio = nil
        phase = .ready
        Task {
            do {
                try await recorder.start()
                phase = .recording
            } catch {
                phase = .failed(error.localizedDescription)
            }
        }
    }

    private func stopAndTranscribe() {
        do {
            let data = try recorder.stop()
            capturedAudio = data
            transcribe(data)
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    private func retryTranscription() {
        guard let capturedAudio else { return }
        transcribe(capturedAudio)
    }

    private func discardRecording() {
        cancelWork()
        capturedAudio = nil
        phase = .ready
    }

    private func transcribe(_ data: Data) {
        submissionTask?.cancel()
        phase = .transcribing
        submissionTask = Task {
            let estimate = await onCapture(data)
            guard !Task.isCancelled else { return }
            phase = estimate.map(MealVoiceCapturePhase.transcribed)
                ?? .failed("We couldn’t transcribe that recording. You can retry it or record again.")
            submissionTask = nil
        }
    }

    private func finish(with estimate: MealEstimate) {
        onComplete(estimate)
        dismiss()
    }

    private func cancel() {
        cancelWork()
        dismiss()
    }

    private func cancelWork() {
        recorder.cancel()
        submissionTask?.cancel()
        submissionTask = nil
    }
}
#endif
