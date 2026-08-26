#if os(iOS)
import SwiftUI

struct MealVoiceTransportView: View {
    let elapsedTime: TimeInterval
    let levels: [Double]
    let isRecording: Bool
    let isProcessing: Bool
    let hasRecording: Bool
    let onDiscard: () -> Void
    let onRecord: () -> Void
    let onRetry: () -> Void
    let onStop: () -> Void

    var body: some View {
        VStack(spacing: MonsSpacing.medium) {
            HStack {
                Text(Duration.seconds(elapsedTime), format: .time(pattern: .minuteSecond))
                    .monospacedDigit()
                Spacer()
                Text("3:00 max")
                    .foregroundStyle(.secondary)
            }
            .font(.caption)

            MealVoiceWaveformView(levels: levels, isActive: isRecording)

            HStack {
                Button("Discard recording", systemImage: "trash", role: .destructive, action: onDiscard)
                    .labelStyle(.iconOnly)
                    .buttonStyle(.glass)
                    .buttonBorderShape(.circle)
                    .disabled(!hasRecording || isProcessing)

                Spacer()

                if isProcessing {
                    ProgressView()
                        .controlSize(.large)
                        .frame(width: 56, height: 56)
                        .accessibilityLabel("Transcribing recording")
                } else if isRecording {
                    Button("Stop recording", systemImage: "stop.fill", action: onStop)
                        .labelStyle(.iconOnly)
                        .font(.title3)
                        .buttonStyle(.glassProminent)
                        .buttonBorderShape(.circle)
                        .tint(MonsColor.error)
                } else {
                    Button("Start recording", systemImage: "mic.fill", action: onRecord)
                        .labelStyle(.iconOnly)
                        .font(.title3)
                        .buttonStyle(.glassProminent)
                        .buttonBorderShape(.circle)
                        .tint(MonsColor.action)
                }

                Spacer()

                Button("Retry transcription", systemImage: "arrow.clockwise", action: onRetry)
                    .labelStyle(.iconOnly)
                    .buttonStyle(.glass)
                    .buttonBorderShape(.circle)
                    .disabled(!hasRecording || isRecording || isProcessing)
            }
        }
        .padding(.vertical, MonsSpacing.xSmall)
    }
}
#endif
