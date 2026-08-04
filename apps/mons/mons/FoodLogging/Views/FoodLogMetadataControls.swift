import SwiftUI

struct FoodLogMetadataControls: View {
    @Binding var loggedAt: Date

    var body: some View {
        DatePicker(
            "Time",
            selection: $loggedAt,
            displayedComponents: [.date, .hourAndMinute]
        )
        .frame(minHeight: 48)
        .padding(.horizontal, 14)
        .background(MonsColor.surface, in: .rect(cornerRadius: MonsRadius.medium))
        .overlay {
            RoundedRectangle(cornerRadius: MonsRadius.medium)
                .stroke(MonsColor.border, lineWidth: 1)
        }
    }
}
