import SwiftUI

struct MealTimelineCardControl: View {
    let meal: MealEvent
    let onMove: (MealEvent, Int) -> Void

    var body: some View {
        HStack(spacing: 0) {
            NavigationLink(value: DetailDestination(meal: meal)) {
                MealTimelineCard(meal: meal)
            }
            .buttonStyle(.plain)
            .accessibilityAction(named: "Move one hour earlier") {
                onMove(meal, -1)
            }
            .accessibilityAction(named: "Move one hour later") {
                onMove(meal, 1)
            }

            Image(systemName: "line.3.horizontal.decrease")
                .foregroundStyle(MonsColor.textSecondary)
                .frame(width: 44, height: 44)
                .contentShape(.rect)
                .draggable(meal.id) {
                    MealDragPreview(meal: meal)
                }
                .accessibilityHidden(true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MonsColor.surface, in: .rect(cornerRadius: MonsRadius.medium))
        .overlay {
            RoundedRectangle(cornerRadius: MonsRadius.medium)
                .stroke(MonsColor.border, lineWidth: 1)
        }
    }
}
