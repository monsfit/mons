import SwiftUI

struct MealTimelineCard: View {
    let meal: MealEvent

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: meal.category.systemImage)
                .foregroundStyle(MonsColor.action)
                .frame(width: 36, height: 36)
                .background(MonsPalette.ember900, in: .circle)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 4) {
                Text(meal.title)
                    .font(MonsTypography.headline)
                    .lineLimit(1)

                Text("\(meal.calories.formatted()) cal  ·  \(meal.macros.protein) P  ·  \(meal.macros.fat) F  ·  \(meal.macros.carbohydrates) C")
                    .font(MonsTypography.subheadline)
                    .foregroundStyle(MonsColor.textSecondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }

            Spacer(minLength: 4)

            Image(systemName: "line.3.horizontal.decrease")
                .foregroundStyle(MonsColor.textSecondary)
                .accessibilityHidden(true)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, minHeight: 64, alignment: .leading)
        .background(MonsColor.surface, in: .rect(cornerRadius: MonsRadius.medium))
        .overlay {
            RoundedRectangle(cornerRadius: MonsRadius.medium)
                .stroke(MonsColor.border, lineWidth: 1)
        }
        .contentShape(.dragPreview, .rect(cornerRadius: 12))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(meal.category.title), \(meal.title), \(meal.loggedAt.formatted(date: .omitted, time: .shortened))")
        .accessibilityValue("\(meal.calories) kilocalories. Protein \(meal.macros.protein) grams, carbohydrates \(meal.macros.carbohydrates) grams, fat \(meal.macros.fat) grams")
        .accessibilityHint("Opens meal details. Drag to another hour to reschedule.")
    }
}
