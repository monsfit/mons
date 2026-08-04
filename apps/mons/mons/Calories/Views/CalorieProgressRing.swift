import SwiftUI

struct CalorieProgressRing: View {
    @ScaledMetric(relativeTo: .body) private var lineWidth = 18.0

    let day: CalorieDayData

    private var progress: Double {
        guard day.calorieGoal > 0 else { return 0 }
        return min(max(Double(day.consumedCalories) / Double(day.calorieGoal), 0), 1)
    }

    private var statusTitle: String {
        day.remainingCalories >= 0 ? "remaining" : "over goal"
    }

    private var statusValue: Int {
        abs(day.remainingCalories)
    }

    var body: some View {
        ZStack {
            Circle()
                .stroke(.quaternary, lineWidth: lineWidth)

            Circle()
                .trim(from: 0, to: progress)
                .stroke(
                    day.remainingCalories >= 0 ? Color.accentColor : Color.orange,
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            VStack {
                Text(day.consumedCalories, format: .number)
                    .font(.title)
                    .bold()

                Text("of \(day.calorieGoal.formatted()) kcal")
                    .foregroundStyle(.secondary)

                Label(
                    "\(statusValue.formatted()) \(statusTitle)",
                    systemImage: day.remainingCalories >= 0 ? "checkmark.circle" : "exclamationmark.circle"
                )
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .frame(maxWidth: 280)
        .padding()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Daily calorie progress")
        .accessibilityValue(
            "\(day.consumedCalories) of \(day.calorieGoal) kilocalories, \(statusValue) kilocalories \(statusTitle)"
        )
    }
}
