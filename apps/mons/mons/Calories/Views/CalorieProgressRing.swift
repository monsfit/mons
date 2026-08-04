import SwiftUI

struct CalorieProgressRing: View {
    @ScaledMetric(relativeTo: .body) private var lineWidth = 10.0

    let day: CalorieDayData

    private var targets: NutritionTargets {
        NutritionTargets(calorieGoal: day.calorieGoal)
    }

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

    private var compactStatus: String {
        day.remainingCalories >= 0
            ? "\(statusValue.formatted()) left"
            : "\(statusValue.formatted()) over"
    }

    var body: some View {
        ZStack {
            Circle()
                .stroke(.quaternary, lineWidth: lineWidth)

            Circle()
                .trim(from: 0, to: progress)
                .stroke(
                    day.remainingCalories >= 0 ? NutritionColor.calories : Color.orange,
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            MacroProgressRing(macros: day.macros, targets: targets)
                .padding(19)

            VStack {
                Text(day.consumedCalories, format: .number)
                    .font(.title)
                    .bold()

                Text(compactStatus)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .frame(maxWidth: 210)
        .padding(.vertical, 16)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Daily calorie progress")
        .accessibilityValue(
            "\(day.consumedCalories) of \(day.calorieGoal) kilocalories, \(statusValue) kilocalories \(statusTitle)"
        )
    }
}
