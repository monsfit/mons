import SwiftUI

struct FoodLogControls: View {
    @Binding var quantityGrams: Double
    let isSaving: Bool
    let onAdd: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            TextField("Amount", value: $quantityGrams, format: .number)
                .textFieldStyle(.plain)
                .multilineTextAlignment(.trailing)
                #if os(iOS)
                .keyboardType(.decimalPad)
                #endif

            Text("g")
                .foregroundStyle(MonsColor.textSecondary)

            Button(action: onAdd) {
                if isSaving {
                    ProgressView()
                        .frame(minWidth: 72)
                } else {
                    Text("Add Food")
                        .frame(minWidth: 72)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(quantityGrams <= 0 || isSaving)
        }
        .padding(8)
        .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 18))
        .padding(.horizontal)
        .padding(.vertical, 8)
    }
}
