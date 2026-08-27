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
                HStack(spacing: MonsSpacing.xSmall) {
                    Image(systemName: "fork.knife")
                    Text("Log Meal")
                    Text(count, format: .number)
                        .monospacedDigit()
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(MonsColor.surfaceRaised, in: .capsule)
                }
                    .fontWeight(.semibold)
                    .fixedSize()
            }
        }
        .disabled(isLogging)
        .accessibilityLabel("Log meal with \(count) \(count == 1 ? "item" : "items")")
    }
}
