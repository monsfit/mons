import SwiftUI

struct CalorieDatePicker: View {
    @Environment(\.dismiss) private var dismiss

    @Binding var selectedDate: Date

    let maximumDate: Date
    let calendar: Calendar

    var body: some View {
        NavigationStack {
            DatePicker(
                "Choose a day",
                selection: daySelection,
                in: ...calendar.startOfDay(for: maximumDate),
                displayedComponents: .date
            )
            .datePickerStyle(.graphical)
            .labelsHidden()
            .padding()
            .navigationTitle("Choose Date")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done", action: dismiss.callAsFunction)
                }
            }
        }
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }

    private var daySelection: Binding<Date> {
        Binding(
            get: { selectedDate },
            set: { selectedDate = calendar.startOfDay(for: $0) }
        )
    }
}

#Preview {
    @Previewable @State var selectedDate = Date.now

    CalorieDatePicker(
        selectedDate: $selectedDate,
        maximumDate: .now,
        calendar: .current
    )
}
