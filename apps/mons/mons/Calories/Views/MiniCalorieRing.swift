import SwiftUI

struct MiniCalorieRing: View {
    let weekday: String
    let progress: Double
    let isSelected: Bool
    let isOverGoal: Bool

    var body: some View {
        ZStack {
            Circle()
                .stroke(
                    .tertiary,
                    style: StrokeStyle(lineWidth: 1.25, lineCap: .round, dash: [2, 4])
                )

            Circle()
                .trim(from: 0, to: progress)
                .stroke(
                    isOverGoal ? Color.orange : Color.accentColor,
                    style: StrokeStyle(lineWidth: 2.5, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            if isSelected {
                Circle()
                    .fill(.tint)
                    .padding(5)
            }

            Text(weekday)
                .font(.caption)
                .fontWeight(isSelected ? .bold : .medium)
                .foregroundStyle(isSelected ? .white : .primary)
        }
        .frame(width: 34, height: 34)
        .accessibilityHidden(true)
    }
}
