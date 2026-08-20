#if DEBUG && os(iOS)
import SwiftUI

struct MealComposerFoodSearchDatePicker: View {
    @Environment(\.dismiss) private var dismiss

    @Binding var selectedDate: Date

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                DatePicker(
                    "Meal date and time",
                    selection: $selectedDate,
                    displayedComponents: [.date, .hourAndMinute]
                )
                .datePickerStyle(.graphical)
                .padding(.horizontal, MonsSpacing.large)

                Spacer(minLength: 0)
            }
            .navigationTitle("Meal Date")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done", action: dismiss.callAsFunction)
                }
            }
        }
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }
}

#Preview("Meal date picker") {
    @Previewable @State var selectedDate = MealComposerPrototypeFixtures.loggedAt

    MealComposerFoodSearchDatePicker(selectedDate: $selectedDate)
}
#endif
