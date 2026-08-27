#if os(iOS)
enum MealVoiceCapturePhase {
    case failed(String)
    case ready
    case recording
    case transcribed(MealEstimate)
    case transcribing
}
#endif
