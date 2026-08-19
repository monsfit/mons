#if os(iOS)
import Foundation

enum MealVoiceRecorderError: LocalizedError {
    case audioSession(String)
    case couldNotStart
    case notRecording
    case permissionDenied
    case recorderSetup(String)
    case recordingTooShort

    var errorDescription: String? {
        switch self {
        case .audioSession(let detail):
            "The microphone session could not start. \(detail)"
        case .couldNotStart:
            "The recording could not start."
        case .notRecording:
            "There is no meal recording to analyze."
        case .permissionDenied:
            "Microphone access is required to describe a meal by voice."
        case .recorderSetup(let detail):
            "The audio recorder could not start. \(detail)"
        case .recordingTooShort:
            "Keep recording for at least a second so there is enough audio to transcribe."
        }
    }
}
#endif
