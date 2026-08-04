import Charts
import SwiftUI

struct CalorieTimingChart: View {
    let meals: [MealEvent]
    let day: Date
    let calendar: Calendar

    private var sortedMeals: [MealEvent] {
        meals.sorted { $0.loggedAt < $1.loggedAt }
    }

    private var dayDomain: ClosedRange<Date> {
        let start = calendar.startOfDay(for: day)
        let end = calendar.date(byAdding: .day, value: 1, to: start) ?? start.addingTimeInterval(86_400)
        return start...end
    }

    private var axisValues: [Date] {
        let start = calendar.startOfDay(for: day)
        return [0, 6, 12, 18].compactMap {
            calendar.date(byAdding: .hour, value: $0, to: start)
        }
    }

    private var timingPoints: [CalorieTimingPoint] {
        var points = [CalorieTimingPoint(date: dayDomain.lowerBound, calories: 0)]

        for meal in sortedMeals {
            points.append(
                CalorieTimingPoint(
                    date: meal.loggedAt.addingTimeInterval(-15 * 60),
                    calories: 0
                )
            )
            points.append(CalorieTimingPoint(date: meal.loggedAt, calories: meal.calories))
            points.append(
                CalorieTimingPoint(
                    date: meal.loggedAt.addingTimeInterval(15 * 60),
                    calories: 0
                )
            )
        }

        points.append(CalorieTimingPoint(date: dayDomain.upperBound, calories: 0))
        return points.sorted { $0.date < $1.date }
    }

    private var upperCalories: Int {
        max((meals.map(\.calories).max() ?? 0) + 100, 500)
    }

    private var accessibilitySummary: String {
        sortedMeals.map {
            "\($0.loggedAt.formatted(date: .omitted, time: .shortened)), \($0.calories) kilocalories"
        }
        .joined(separator: "; ")
    }

    var body: some View {
        VStack(alignment: .leading) {
            Chart {
                ForEach(timingPoints) { point in
                    LineMark(
                        x: .value("Time", point.date),
                        y: .value("Calories", point.calories)
                    )
                    .foregroundStyle(.tint)
                    .interpolationMethod(.linear)
                    .lineStyle(
                        StrokeStyle(
                            lineWidth: 3,
                            lineCap: .round,
                            dash: [1, 6]
                        )
                    )
                }

                ForEach(sortedMeals) { meal in
                    PointMark(
                        x: .value("Time", meal.loggedAt),
                        y: .value("Calories", meal.calories)
                    )
                    .foregroundStyle(.tint)
                    .symbolSize(24)
                }
            }
            .chartXScale(domain: dayDomain)
            .chartYScale(domain: -50...upperCalories)
            .chartXAxis {
                AxisMarks(values: axisValues) { value in
                    AxisGridLine()
                        .foregroundStyle(.quaternary)
                    AxisValueLabel(format: .dateTime.hour())
                }
            }
            .chartYAxis(.hidden)
            .frame(height: 120)

            Text("Total \(meals.reduce(0) { $0 + $1.calories }.formatted()) kcal")
                .font(.subheadline)
                .bold()
                .foregroundStyle(.tint)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Calories by time of day")
        .accessibilityValue(accessibilitySummary)
    }
}
