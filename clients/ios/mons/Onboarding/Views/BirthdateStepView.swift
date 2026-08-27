import SwiftUI

struct BirthdateStepView: View {
    @Binding var birthDate: Date
    let referenceDate: Date
    let calendar: Calendar

    private var validRange: ClosedRange<Date> {
        let oldest = calendar.date(byAdding: .year, value: -120, to: referenceDate) ?? .distantPast
        let youngest = calendar.date(byAdding: .year, value: -18, to: referenceDate) ?? referenceDate
        return oldest...youngest
    }

    var body: some View {
        DatePicker(
            "Birthdate",
            selection: $birthDate,
            in: validRange,
            displayedComponents: .date
        )
        #if os(iOS)
        .datePickerStyle(.wheel)
        #endif
        .labelsHidden()
        .frame(maxWidth: .infinity)
    }
}
