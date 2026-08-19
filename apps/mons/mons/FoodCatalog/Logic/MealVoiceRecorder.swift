#if os(iOS)
import AVFoundation
import Foundation
import Observation

@Observable
@MainActor
final class MealVoiceRecorder: NSObject, AVAudioRecorderDelegate {
    private(set) var elapsedTime: TimeInterval = 0
    private(set) var isRecording = false
    private(set) var levels = Array(repeating: 0.06, count: 32)

    @ObservationIgnored private var meteringTask: Task<Void, Never>?
    @ObservationIgnored private var recorder: AVAudioRecorder?
    @ObservationIgnored private var recordingURL: URL?

    func start() async throws {
        guard !isRecording else { return }
        guard await requestPermission() else { throw MealVoiceRecorderError.permissionDenied }

        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.record, mode: .measurement)
            try session.setActive(true)
        } catch {
            throw MealVoiceRecorderError.audioSession(error.localizedDescription)
        }

        let url = URL.temporaryDirectory
            .appending(path: "mons-meal-\(UUID().uuidString)")
            .appendingPathExtension("wav")
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatLinearPCM),
            AVSampleRateKey: 16_000.0,
            AVNumberOfChannelsKey: 1,
            AVLinearPCMBitDepthKey: 16,
            AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsFloatKey: false
        ]
        let recorder: AVAudioRecorder
        do {
            recorder = try AVAudioRecorder(url: url, settings: settings)
        } catch {
            try? session.setActive(false, options: .notifyOthersOnDeactivation)
            throw MealVoiceRecorderError.recorderSetup(error.localizedDescription)
        }
        recorder.delegate = self
        recorder.isMeteringEnabled = true
        guard recorder.prepareToRecord() else {
            try? session.setActive(false, options: .notifyOthersOnDeactivation)
            throw MealVoiceRecorderError.couldNotStart
        }
        guard recorder.record() else {
            try? session.setActive(false, options: .notifyOthersOnDeactivation)
            throw MealVoiceRecorderError.couldNotStart
        }

        self.recorder = recorder
        recordingURL = url
        elapsedTime = 0
        levels = Array(repeating: 0.06, count: 32)
        isRecording = true
        startMetering()
    }

    func stop() throws -> Data {
        guard let recorder, let recordingURL, isRecording else {
            throw MealVoiceRecorderError.notRecording
        }
        let duration = recorder.currentTime
        meteringTask?.cancel()
        meteringTask = nil
        recorder.stop()
        self.recorder = nil
        self.recordingURL = nil
        isRecording = false
        try? AVAudioSession.sharedInstance().setActive(
            false,
            options: .notifyOthersOnDeactivation
        )
        defer { try? FileManager.default.removeItem(at: recordingURL) }
        let data = try Data(contentsOf: recordingURL)
        guard duration >= 0.6, data.count > 1_024 else {
            throw MealVoiceRecorderError.recordingTooShort
        }
        return data
    }

    func cancel() {
        meteringTask?.cancel()
        meteringTask = nil
        recorder?.stop()
        recorder = nil
        isRecording = false
        if let recordingURL { try? FileManager.default.removeItem(at: recordingURL) }
        recordingURL = nil
        elapsedTime = 0
        levels = Array(repeating: 0.06, count: 32)
        try? AVAudioSession.sharedInstance().setActive(
            false,
            options: .notifyOthersOnDeactivation
        )
    }

    private func requestPermission() async -> Bool {
        await withCheckedContinuation { continuation in
            AVAudioApplication.requestRecordPermission { granted in
                continuation.resume(returning: granted)
            }
        }
    }

    private func startMetering() {
        meteringTask?.cancel()
        meteringTask = Task { @MainActor [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(70))
                guard let self, let recorder = self.recorder, self.isRecording else { return }
                recorder.updateMeters()
                let decibels = Double(recorder.averagePower(forChannel: 0))
                let amplitude = max(0.06, min(1, pow(10, decibels / 32)))
                levels.removeFirst()
                levels.append(amplitude)
                elapsedTime = recorder.currentTime
            }
        }
    }
}
#endif
