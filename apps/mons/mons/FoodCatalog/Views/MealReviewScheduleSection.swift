import SwiftUI

struct MealReviewScheduleSection: View {
    @Binding var loggedAt: Date
    @Binding var mealCategory: MealCategory

    let allowsDeletion: Bool
    let onDelete: () -> Void

    var body: some View {
        Section("When") {
            DatePicker("Date and time", selection: $loggedAt)
            Picker("Meal", selection: $mealCategory) {
                ForEach(MealCategory.allCases, id: \.self) { category in
                    Label(category.title, systemImage: category.systemImage)
                        .tag(category)
                }
            }
        }
        if allowsDeletion {
            Section {
                Button("Delete Meal", systemImage: "trash", role: .destructive, action: onDelete)
            }
        }
    }
}
