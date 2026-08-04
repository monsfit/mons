import SwiftUI

struct MealTimelineRow: View {
    let meal: MealEvent
    let onMove: (MealEvent, Int) -> Void

    var body: some View {
        HStack(alignment: .center, spacing: 8) {
            Text(meal.loggedAt, format: .dateTime.hour().minute())
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .monospacedDigit()
                .frame(width: 52)
                .background(.background)

            NavigationLink(value: DetailDestination(meal: meal)) {
                MealTimelineCard(meal: meal)
            }
            .buttonStyle(.plain)
            .draggable(meal.id) {
                MealDragPreview(meal: meal)
            }
            .accessibilityAction(named: "Move one hour earlier") {
                onMove(meal, -1)
            }
            .accessibilityAction(named: "Move one hour later") {
                onMove(meal, 1)
            }
        }
    }
}
