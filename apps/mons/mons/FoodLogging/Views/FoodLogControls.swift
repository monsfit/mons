import SwiftUI

struct FoodLogControls: View {
    @Binding var amount: Double
    @Binding var selectedPortion: FoodPortion?

    let portions: [FoodPortion]
    let isSaving: Bool
    let pendingItemCount: Int
    let onAdd: () -> Void
    let onLog: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            TextField("Amount", value: $amount, format: .number)
                .textFieldStyle(.plain)
                .multilineTextAlignment(.trailing)
                #if os(iOS)
                .keyboardType(.decimalPad)
                #endif

            if portions.isEmpty {
                Text("g")
                    .foregroundStyle(MonsColor.textSecondary)
                    .frame(minHeight: 44)
            } else {
                FoodPortionMenu(
                    amount: $amount,
                    selectedPortion: $selectedPortion,
                    portions: portions
                )
            }

            Button(action: onLog) {
                if isSaving {
                    ProgressView()
                        .frame(minWidth: 78)
                } else {
                    Text(pendingItemCount == 0 ? "Log Food" : "Log Foods")
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                        .frame(minWidth: 78)
                }
            }
            .buttonStyle(.glass)
            .buttonBorderShape(.capsule)
            .layoutPriority(1)
            .disabled(amount <= 0 || isSaving)

            Button("Add", action: onAdd)
                .buttonStyle(.glassProminent)
                .buttonBorderShape(.capsule)
                .tint(MonsColor.action)
                .layoutPriority(1)
                .disabled(amount <= 0 || isSaving)
        }
        .padding(8)
        .glassEffect(.regular, in: .rect(cornerRadius: 18))
        .padding(.horizontal)
        .padding(.vertical, 8)
    }
}
