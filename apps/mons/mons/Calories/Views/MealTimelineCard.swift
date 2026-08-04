import SwiftUI

struct MealTimelineCard: View {
    let meal: MealEvent

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: meal.category.systemImage)
                .foregroundStyle(.tint)
                .frame(width: 36, height: 36)
                .background(.quaternary, in: .circle)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 4) {
                Text(meal.title)
                    .font(.headline)
                    .lineLimit(1)

                Text("\(meal.calories.formatted()) cal  ·  \(meal.macros.protein) P  ·  \(meal.macros.fat) F  ·  \(meal.macros.carbohydrates) C")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }

            Spacer(minLength: 4)

            Image(systemName: "line.3.horizontal.decrease")
                .foregroundStyle(.primary)
                .accessibilityHidden(true)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, minHeight: 64, alignment: .leading)
        .background(.background, in: .rect(cornerRadius: 12))
        .contentShape(.dragPreview, .rect(cornerRadius: 12))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(meal.category.title), \(meal.title), \(meal.loggedAt.formatted(date: .omitted, time: .shortened))")
        .accessibilityValue("\(meal.calories) kilocalories. Protein \(meal.macros.protein) grams, carbohydrates \(meal.macros.carbohydrates) grams, fat \(meal.macros.fat) grams")
        .accessibilityHint("Opens meal details. Drag to another hour to reschedule.")
    }
}
