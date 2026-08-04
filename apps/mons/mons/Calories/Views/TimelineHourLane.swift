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
        VStack(alignment: .leading, spacing: 0) {
            GlassEffectContainer(spacing: 4) {
                HStack(spacing: 4) {
                    Text(scheduledAt, format: .dateTime.hour())
                        .font(MonsTypography.subheadline)
                        .lineLimit(1)
                        .fixedSize(horizontal: true, vertical: false)
                        .padding(.horizontal, 12)
                        .frame(minHeight: 32)
                        .glassEffect(.regular, in: .capsule)

                    Button("Add food at \(scheduledAt.formatted(date: .omitted, time: .shortened))", systemImage: "plus", action: addMeal)
                        .labelStyle(.iconOnly)
                        .frame(width: 44, height: 44)
                        .buttonStyle(.glass)
                        .buttonBorderShape(.circle)

                    Spacer()
                }
            }

            ZStack {
                Rectangle()
                    .fill(isCurrentHour ? MonsColor.action : MonsColor.textMuted)
                    .frame(width: isCurrentHour ? 2 : 1)
                    .frame(maxHeight: .infinity)
                    .padding(.leading, 25)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityHidden(true)

                if meals.isEmpty && isDropTargeted {
                    Label("Move to \(scheduledAt.formatted(date: .omitted, time: .shortened))", systemImage: "arrow.down.circle")
                        .font(MonsTypography.subheadline)
                        .foregroundStyle(MonsColor.action)
                        .frame(maxWidth: .infinity)
                } else {
                    LazyVStack(spacing: 8) {
                        ForEach(meals) { meal in
                            MealTimelineRow(meal: meal, onMove: move)
                        }
                    }
                    .padding(.vertical, meals.isEmpty ? 0 : 6)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .frame(maxWidth: .infinity, minHeight: meals.isEmpty ? 44 : 72)
        }
        .padding(.vertical, MonsSpacing.xSmall)
        .background(
            isDropTargeted ? MonsColor.action.opacity(0.12) : Color.clear,
            in: .rect(cornerRadius: MonsRadius.medium)
        )
        .overlay {
            RoundedRectangle(cornerRadius: MonsRadius.medium)
                .stroke(
                    isDropTargeted ? MonsColor.action : Color.clear,
                    style: StrokeStyle(lineWidth: 1.5, dash: [6, 4])
                )
        }
        .contentShape(.rect)
        .dropDestination(for: String.self, action: dropMeals, isTargeted: updateDropTarget)
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

    private func move(_ meal: MealEvent, _ hourOffset: Int) {
        guard let destination = calendar.date(byAdding: .hour, value: hourOffset, to: meal.loggedAt) else {
            return
        }

        _ = onMoveMeal(meal.id, destination)
    }
}
