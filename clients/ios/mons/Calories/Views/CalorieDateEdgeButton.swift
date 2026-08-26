import SwiftUI

struct CalorieDateEdgeButton: View {
    let date: Date
    let isHidden: Bool
    let isCollapsed: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 1) {
                Text(date, format: .dateTime.weekday(.abbreviated))
                    .font(.caption)

                Text(date, format: .dateTime.day())
                    .font(.body)
                    .monospacedDigit()
            }
            .foregroundStyle(.tertiary)
            .contentTransition(.numericText())
            .frame(width: isCollapsed ? 0 : 52)
            .frame(minHeight: 44)
            .clipped()
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .opacity(isHidden || isCollapsed ? 0 : 1)
        .disabled(isHidden || isCollapsed)
        .accessibilityHidden(isHidden || isCollapsed)
        .accessibilityLabel(date.formatted(date: .complete, time: .omitted))
    }
}

#Preview {
    CalorieDateEdgeButton(
        date: CalorieSampleData.previewReferenceDate,
        isHidden: false,
        isCollapsed: false
    ) {}
        .frame(width: 60)
}
