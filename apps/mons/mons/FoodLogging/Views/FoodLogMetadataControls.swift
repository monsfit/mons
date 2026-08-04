import SwiftUI

struct FoodLogMetadataControls: View {
    @Binding var category: MealCategory
    @Binding var loggedAt: Date

    var body: some View {
        VStack(spacing: 0) {
            Picker("Meal", selection: $category) {
                ForEach(MealCategory.allCases) { category in
                    Label(category.title, systemImage: category.systemImage)
                        .tag(category)
                }
            }
            .pickerStyle(.menu)
            .frame(minHeight: 48)

            Divider()

            DatePicker(
                "Time",
                selection: $loggedAt,
                displayedComponents: [.date, .hourAndMinute]
            )
            .frame(minHeight: 48)
        }
        .padding(.horizontal, 14)
        .background(MonsColor.surface, in: .rect(cornerRadius: MonsRadius.medium))
        .overlay {
            RoundedRectangle(cornerRadius: MonsRadius.medium)
                .stroke(MonsColor.border, lineWidth: 1)
        }
    }
}
