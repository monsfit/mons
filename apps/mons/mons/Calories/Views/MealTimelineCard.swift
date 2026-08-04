import SwiftUI

struct MealTimelineCard: View {
    let meal: MealEvent

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(meal.title)
                    .font(.headline)
                    .lineLimit(2)

                Spacer(minLength: 4)

                Text("\(meal.calories.formatted()) cal")
                    .font(.subheadline)
                    .bold()
                    .foregroundStyle(.pink)
                    .fixedSize()
            }

            HStack {
                Text(meal.loggedAt, format: .dateTime.hour().minute())
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Spacer()

                Image(systemName: "line.3.horizontal")
                    .foregroundStyle(.secondary)
                    .accessibilityHidden(true)
            }

            HStack(spacing: 6) {
                MacroBadge(label: "P", value: meal.macros.protein, color: .blue)
                MacroBadge(label: "C", value: meal.macros.carbohydrates, color: .green)
                MacroBadge(label: "F", value: meal.macros.fat, color: .orange)
            }
        }
        .padding(12)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 14))
        .contentShape(.dragPreview, RoundedRectangle(cornerRadius: 14))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(meal.category.title), \(meal.title), \(meal.loggedAt.formatted(date: .omitted, time: .shortened))")
        .accessibilityValue("\(meal.calories) kilocalories. Protein \(meal.macros.protein) grams, carbohydrates \(meal.macros.carbohydrates) grams, fat \(meal.macros.fat) grams")
        .accessibilityHint("Opens meal details. Drag to another hour to reschedule.")
    }
}
