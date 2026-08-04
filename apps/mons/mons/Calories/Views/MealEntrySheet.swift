import SwiftUI

struct MealEntrySheet: View {
    let scheduledAt: Date
    let onSave: (MealEvent) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var category = MealCategory.snack
    @State private var calories = 0
    @State private var protein = 0
    @State private var carbohydrates = 0
    @State private var fat = 0

    var body: some View {
        NavigationStack {
            Form {
                LabeledContent("Time") {
                    Text(scheduledAt, format: .dateTime.hour().minute())
                }

                TextField("Meal name", text: $title)

                Picker("Meal", selection: $category) {
                    ForEach(MealCategory.allCases) { category in
                        Label(category.title, systemImage: category.systemImage)
                            .tag(category)
                    }
                }

                Section("Nutrition") {
                    TextField("Calories", value: $calories, format: .number)
                    TextField("Protein (g)", value: $protein, format: .number)
                    TextField("Carbohydrates (g)", value: $carbohydrates, format: .number)
                    TextField("Fat (g)", value: $fat, format: .number)
                }
            }
            .navigationTitle("Add meal")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: dismiss.callAsFunction)
                        .tint(MonsColor.error)
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Save", action: save)
                        .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }

    private func save() {
        let meal = MealEvent(
            id: UUID().uuidString,
            title: title.trimmingCharacters(in: .whitespacesAndNewlines),
            category: category,
            loggedAt: scheduledAt,
            itemCount: 1,
            calories: max(calories, 0),
            macros: MacroTotals(
                protein: max(protein, 0),
                carbohydrates: max(carbohydrates, 0),
                fat: max(fat, 0)
            )
        )

        onSave(meal)
        dismiss()
    }
}
