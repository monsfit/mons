#if DEBUG && os(iOS)
import SwiftUI

struct MealComposerFoodSearchHeader: ToolbarContent {
    let dateLabel: String
    @Binding var selectedDate: Date
    @Binding var isDatePickerPresented: Bool
    let calories: Int
    let calorieGoal: Int
    let showsMealSummary: Bool
    let onClose: () -> Void
    let onToggleMealSummary: () -> Void

    var body: some ToolbarContent {
        ToolbarItem(placement: .cancellationAction) {
            Button("Close", systemImage: "xmark", action: onClose)
                .labelStyle(.iconOnly)
        }

        ToolbarItem(placement: .principal) {
            Button(action: presentDatePicker) {
                HStack(spacing: MonsSpacing.xSmall) {
                    Image(systemName: "calendar")

                    Text(dateLabel)
                }
                .font(.subheadline)
                .lineLimit(1)
                .minimumScaleFactor(0.85)
            }
            .accessibilityLabel("Meal date and time, \(dateLabel)")
            .accessibilityHint("Changes the date and time for this meal")
            .sheet(isPresented: $isDatePickerPresented) {
                MealComposerFoodSearchDatePicker(selectedDate: $selectedDate)
            }
        }

        ToolbarItem(placement: .confirmationAction) {
            Button(action: onToggleMealSummary) {
                HStack(spacing: MonsSpacing.xSmall) {
                    Text("\(calories) / \(calorieGoal)")
                        .monospacedDigit()

                    Image(systemName: showsMealSummary ? "chevron.up" : "chevron.down")
                        .accessibilityHidden(true)
                }
                .font(.subheadline)
                .lineLimit(1)
                .minimumScaleFactor(0.85)
            }
            .accessibilityLabel("Meal calories, \(calories) of \(calorieGoal)")
            .accessibilityHint("Shows the selected meal items")
        }
    }

    private func presentDatePicker() {
        isDatePickerPresented = true
    }
}

#Preview("Food search toolbar") {
    @Previewable @State var selectedDate = MealComposerPrototypeFixtures.loggedAt
    @Previewable @State var isDatePickerPresented = false

    NavigationStack {
        Color.clear
            .toolbar {
                MealComposerFoodSearchHeader(
                    dateLabel: "Today • 11 AM",
                    selectedDate: $selectedDate,
                    isDatePickerPresented: $isDatePickerPresented,
                    calories: 440,
                    calorieGoal: 2_200,
                    showsMealSummary: false,
                    onClose: {},
                    onToggleMealSummary: {}
                )
            }
            .toolbarBackgroundVisibility(.visible, for: .navigationBar)
    }
}
#endif
