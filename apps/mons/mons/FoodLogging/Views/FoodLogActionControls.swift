import SwiftUI

struct FoodLogActionControls: View {
    let amount: Double
    let expands: Bool
    let isSaving: Bool
    let pendingItemCount: Int
    let onAdd: () -> Void
    let onLog: () -> Void

    var body: some View {
        HStack(spacing: MonsSpacing.small) {
            Button(action: onLog) {
                Group {
                    if isSaving {
                        ProgressView()
                    } else {
                        Text(pendingItemCount == 0 ? "Log Food" : "Log Foods")
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }
                }
                .frame(minWidth: 82, maxWidth: expands ? .infinity : nil, minHeight: 44)
            }
            .buttonStyle(.glass)
            .buttonBorderShape(.capsule)
            .disabled(amount <= 0 || isSaving)

            Button(action: onAdd) {
                Text("Add")
                    .lineLimit(1)
                    .foregroundStyle(MonsColor.actionForeground)
                    .frame(minWidth: 54, maxWidth: expands ? .infinity : nil, minHeight: 44)
            }
            .buttonStyle(.glassProminent)
            .buttonBorderShape(.capsule)
            .tint(MonsColor.action)
            .disabled(amount <= 0 || isSaving)
        }
    }
}
