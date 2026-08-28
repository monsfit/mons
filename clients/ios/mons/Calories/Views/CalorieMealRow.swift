import SwiftUI

struct CalorieMealRow: View {
    let meal: MealEvent

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(meal.title)
                    .font(.body)
                    .lineLimit(1)

                HStack(spacing: 5) {
                    Text(meal.loggedAt, format: .dateTime.hour().minute())

                    Text("·")

                    Text(meal.itemCount == 1 ? "1 item" : "\(meal.itemCount) items")
                }
                .font(.subheadline)
                .foregroundStyle(.secondary)

                Text("\(meal.calories) cal")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
            }

            Spacer(minLength: 8)

            Image(systemName: "chevron.right")
                .font(.subheadline)
                .foregroundStyle(.tertiary)
                .accessibilityHidden(true)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.background, in: .rect(cornerRadius: 14))
        .contentShape(.rect)
        .accessibilityElement(children: .combine)
        .accessibilityHint("Opens meal details and editing")
    }
}

#Preview {
    let day = CalorieSampleData.days(
        referenceDate: CalorieSampleData.previewReferenceDate,
        calendar: .current
    )[0]
    VStack(spacing: 8) {
        CalorieMealRow(meal: day.meals[0])
        CalorieMealRow(meal: day.meals[1])
    }
    .padding()
    .background(Color.secondary.opacity(0.08))
}
