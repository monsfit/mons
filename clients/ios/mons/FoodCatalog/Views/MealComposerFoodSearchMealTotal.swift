#if DEBUG && os(iOS)
import SwiftUI

struct MealComposerFoodSearchMealTotal: View {
    let itemCount: Int
    let calories: Int
    let onLogMeal: () -> Void

    var body: some View {
        Button(action: onLogMeal) {
            HStack(spacing: MonsSpacing.medium) {
                Label("Log Meal", systemImage: "fork.knife")
                    .bold()

                Spacer(minLength: MonsSpacing.small)

                Text("\(itemCount) · \(calories) cal")
            }
            .frame(maxWidth: .infinity, minHeight: 44)
        }
        .buttonStyle(.glassProminent)
        .disabled(itemCount == 0)
        .accessibilityLabel("Log meal, \(itemCount) items, \(calories) calories")
        .padding(.horizontal, MonsSpacing.large)
        .padding(.vertical, MonsSpacing.small)
    }
}
#endif
