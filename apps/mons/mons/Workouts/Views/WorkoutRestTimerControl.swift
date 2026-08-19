import SwiftUI

struct WorkoutRestTimerControl: View {
    @Binding var endDate: Date?

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            Button(action: toggleTimer) {
                Label(timerText(at: context.date), systemImage: "timer")
                    .font(MonsTypography.headline)
                    .monospacedDigit()
                    .frame(maxWidth: .infinity, minHeight: 52)
            }
            .buttonStyle(.plain)
            .foregroundStyle(isRunning(at: context.date) ? MonsColor.workoutAccent : MonsColor.textPrimary)
            .background(MonsColor.surface, in: .rect(cornerRadius: MonsRadius.medium))
            .overlay {
                RoundedRectangle(cornerRadius: MonsRadius.medium)
                    .stroke(MonsColor.border, lineWidth: 1)
            }
            .accessibilityHint(isRunning(at: context.date) ? "Stops the rest timer" : "Starts a two minute rest timer")
        }
    }

    private func isRunning(at date: Date) -> Bool {
        guard let endDate else { return false }
        return endDate > date
    }

    private func timerText(at date: Date) -> String {
        guard let endDate, endDate > date else { return "Rest Timer" }
        return WorkoutRequestBuilder.formattedRest(Int(endDate.timeIntervalSince(date).rounded(.up)))
    }

    private func toggleTimer() {
        if let endDate, endDate > .now {
            self.endDate = nil
        } else {
            endDate = .now.addingTimeInterval(120)
        }
    }
}
