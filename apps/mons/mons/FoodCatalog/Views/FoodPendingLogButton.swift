import SwiftUI

struct FoodPendingLogButton: View {
    let count: Int
    let isLogging: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            if isLogging {
                ProgressView()
            } else {
                Label("Log Foods", systemImage: "checkmark")
            }
        }
        .disabled(isLogging)
        .accessibilityLabel("Log \(count) foods")
    }
}
