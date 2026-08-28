import SwiftUI

struct CalorieSummaryRow: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let day: CalorieDayData

    private var targets: NutritionTargets {
        NutritionTargets(calorieGoal: day.calorieGoal)
    }

    private var valueAnimation: Animation? {
        reduceMotion ? nil : .smooth(duration: 0.28)
    }

    var body: some View {
        VStack(spacing: 10) {
            calorieCard
            macroCard
        }
    }

    private var calorieCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Calories")
                .font(.subheadline)

            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(day.consumedCalories.formatted())
                    .font(.title2.bold())
                    .monospacedDigit()
                    .contentTransition(.numericText())
                    .animation(valueAnimation, value: day.consumedCalories)

                Text("cal")
                    .font(.title3)

                Text("/ \(day.calorieGoal.formatted())")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
                    .contentTransition(.numericText())
                    .animation(valueAnimation, value: day.calorieGoal)

                Spacer()

                Text(remainingLabel(day.remainingCalories))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
                    .contentTransition(.numericText())
                    .animation(valueAnimation, value: day.remainingCalories)
            }

            ProgressView(value: progress(consumed: day.consumedCalories, target: day.calorieGoal))
                .tint(.blue)
                .animation(valueAnimation, value: day.consumedCalories)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.background, in: .rect(cornerRadius: 18))
        .accessibilityElement(children: .combine)
    }

    private var macroCard: some View {
        HStack(alignment: .top, spacing: 16) {
            macroColumn(
                title: "Carbs",
                consumed: day.macros.carbohydrates,
                target: targets.carbohydrates,
                tint: .teal
            )

            macroColumn(
                title: "Fat",
                consumed: day.macros.fat,
                target: targets.fat,
                tint: .purple
            )

            macroColumn(
                title: "Protein",
                consumed: day.macros.protein,
                target: targets.protein,
                tint: .orange
            )
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.background, in: .rect(cornerRadius: 18))
    }

    private func macroColumn(
        title: String,
        consumed: Int,
        target: Int,
        tint: Color
    ) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(title)
                .font(.subheadline)

            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text("\(consumed)g")
                    .font(.headline)
                    .monospacedDigit()
                    .contentTransition(.numericText())
                    .animation(valueAnimation, value: consumed)

                Text("/ \(target)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
            }

            ProgressView(value: progress(consumed: consumed, target: target))
                .tint(tint)
                .animation(valueAnimation, value: consumed)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }

    private func remainingLabel(_ value: Int) -> String {
        value >= 0 ? "\(value.formatted()) left" : "\(abs(value).formatted()) over"
    }

    private func progress(consumed: Int, target: Int) -> Double {
        guard target > 0 else { return 0 }
        return min(max(Double(consumed) / Double(target), 0), 1)
    }
}

#Preview("Nutrition summary") {
    CalorieSummaryRow(
        day: CalorieSampleData.days(
            referenceDate: CalorieSampleData.previewReferenceDate,
            calendar: .current
        )[0]
    )
        .padding()
}
