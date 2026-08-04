import SwiftUI

struct DashboardCalorieGauge: View {
    let day: CalorieDayData

    private var progress: Double {
        guard day.calorieGoal > 0 else { return 0 }
        return min(max(Double(day.consumedCalories) / Double(day.calorieGoal), 0), 1)
    }

    var body: some View {
        ZStack {
            Circle()
                .trim(from: 0.08, to: 0.92)
                .stroke(MonsColor.border, style: StrokeStyle(lineWidth: 7, lineCap: .round))
                .rotationEffect(.degrees(90))

            Circle()
                .trim(from: 0.08, to: 0.08 + 0.84 * progress)
                .stroke(
                    NutritionColor.calories,
                    style: StrokeStyle(lineWidth: 7, lineCap: .round)
                )
                .rotationEffect(.degrees(90))

            VStack {
                Text(day.consumedCalories, format: .number)
                    .font(MonsTypography.metric)
                    .contentTransition(.numericText())
                Text("Consumed")
                    .font(MonsTypography.subheadline)
                    .foregroundStyle(MonsColor.textSecondary)
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .frame(maxWidth: 150)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Calories consumed")
        .accessibilityValue("\(day.consumedCalories) of \(day.calorieGoal) kilocalories")
    }
}
