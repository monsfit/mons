import SwiftUI

struct TimelineHourLane: View {
    let hour: Int
    let day: Date
    let meals: [MealEvent]
    let isCurrentHour: Bool
    let calendar: Calendar
    let onAddMeal: (Date) -> Void
    let onMoveMeal: (String, Date) -> Bool

    @State private var isDropTargeted = false

    private var scheduledAt: Date {
        calendar.date(bySettingHour: hour, minute: 0, second: 0, of: day) ?? day
    }

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            VStack(spacing: 4) {
                HStack(spacing: 2) {
                    Text(scheduledAt, format: .dateTime.hour())
                        .font(.caption)
                        .lineLimit(1)

                    Button("Add meal", systemImage: "plus", action: addMeal)
                        .labelStyle(.iconOnly)
                        .frame(width: 44, height: 44)
                        .contentShape(.circle)
                }

                Rectangle()
                    .fill(isCurrentHour ? Color.accentColor : Color.secondary)
                    .frame(width: isCurrentHour ? 2 : 1)
                    .frame(maxHeight: .infinity)
                    .accessibilityHidden(true)
            }
            .frame(width: 84)

            ZStack {
                RoundedRectangle(cornerRadius: 14)
                    .fill(isDropTargeted ? Color.accentColor.opacity(0.12) : .clear)

                RoundedRectangle(cornerRadius: 14)
                    .stroke(
                        isDropTargeted ? Color.accentColor : .clear,
                        style: StrokeStyle(lineWidth: 1.5, dash: [5, 5])
                    )

                if meals.isEmpty && isDropTargeted {
                    Label("Move to \(scheduledAt.formatted(date: .omitted, time: .shortened))", systemImage: "arrow.down.circle")
                        .font(.subheadline)
                        .foregroundStyle(.tint)
                } else {
                    LazyVStack(spacing: 8) {
                        ForEach(meals) { meal in
                            NavigationLink(value: DetailDestination(meal: meal)) {
                                MealTimelineCard(meal: meal)
                            }
                            .buttonStyle(.plain)
                            .draggable(meal.id) {
                                MealDragPreview(meal: meal)
                            }
                            .accessibilityAction(named: "Move one hour earlier") {
                                move(meal, by: -1)
                            }
                            .accessibilityAction(named: "Move one hour later") {
                                move(meal, by: 1)
                            }
                        }
                    }
                    .padding(.vertical, meals.isEmpty ? 0 : 4)
                }
            }
            .frame(maxWidth: .infinity, minHeight: meals.isEmpty ? 58 : 84)
            .contentShape(.rect)
            .dropDestination(for: String.self, action: dropMeals, isTargeted: updateDropTarget)
            .animation(.easeInOut(duration: 0.15), value: isDropTargeted)
        }
    }

    private func addMeal() {
        onAddMeal(scheduledAt)
    }

    private func dropMeals(_ identifiers: [String], at _: CGPoint) -> Bool {
        guard let identifier = identifiers.first else { return false }
        return onMoveMeal(identifier, scheduledAt)
    }

    private func updateDropTarget(_ isTargeted: Bool) {
        isDropTargeted = isTargeted
    }

    private func move(_ meal: MealEvent, by hourOffset: Int) {
        guard let destination = calendar.date(byAdding: .hour, value: hourOffset, to: meal.loggedAt) else {
            return
        }

        _ = onMoveMeal(meal.id, destination)
    }
}
