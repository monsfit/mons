import SwiftUI

struct CalorieMealRow: View {
    let meal: MealEvent

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: meal.category.systemImage)
                .frame(width: 32, height: 32)
                .foregroundStyle(.secondary)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 4) {
                Text(meal.title)
                    .font(.body)

                Text("\(meal.macros.protein)g protein · \(meal.macros.carbohydrates)g carbs · \(meal.macros.fat)g fat")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(meal.loggedAt, format: .dateTime.hour().minute())
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Text("\(meal.calories) cal")
                    .font(.body)
            }
        }
        .contentShape(.rect)
        .accessibilityElement(children: .combine)
        .accessibilityHint("Opens meal details")
    }
}

#Preview {
    let day = CalorieSampleData.days(referenceDate: .now, calendar: .current)[0]
    List {
        CalorieMealRow(meal: day.meals[0])
    }
}
