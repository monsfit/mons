import SwiftUI

struct WorkoutElapsedTimeLabel: View {
    let startedAt: Date

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            Label(elapsed(at: context.date), systemImage: "timer")
                .font(MonsTypography.subheadline)
                .foregroundStyle(MonsColor.textSecondary)
                .monospacedDigit()
                .accessibilityLabel("Workout elapsed time")
                .accessibilityValue(elapsed(at: context.date))
        }
    }

    private func elapsed(at date: Date) -> String {
        let seconds = max(Int(date.timeIntervalSince(startedAt)), 0)
        return WorkoutDurationFormatter.minuteSecond(seconds)
    }
}
