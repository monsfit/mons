import SwiftUI

struct MealTimelineRow: View {
    let meal: MealEvent
    let isLast: Bool

    var body: some View {
        HStack(alignment: .top) {
            TimelineMarkerView(isLast: isLast)

            VStack(alignment: .leading) {
                HStack {
                    Label(meal.category.title, systemImage: meal.category.systemImage)
                        .foregroundStyle(.secondary)
                    Text(meal.loggedAt, format: .dateTime.hour().minute())
                        .foregroundStyle(.secondary)
                }
                .font(.subheadline)

                Text(meal.title)
                    .font(.headline)

                Text("\(meal.itemCount) items · P \(meal.macros.protein) g · C \(meal.macros.carbohydrates) g · F \(meal.macros.fat) g")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Text("\(meal.calories.formatted())")
                .font(.headline)
            Text("kcal")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(meal.category.title), \(meal.title)")
        .accessibilityValue(
            "\(meal.calories) kilocalories, \(meal.itemCount) items, \(meal.macros.protein) grams protein, \(meal.macros.carbohydrates) grams carbohydrates, \(meal.macros.fat) grams fat"
        )
        .accessibilityHint("Opens the meal details placeholder")
    }
}
