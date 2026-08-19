import SwiftUI

struct MealReviewTranscriptSection: View {
    let transcript: String

    var body: some View {
        Section("Voice transcript") {
            Text(transcript)
                .foregroundStyle(.secondary)
                .textSelection(.enabled)
        }
    }
}
