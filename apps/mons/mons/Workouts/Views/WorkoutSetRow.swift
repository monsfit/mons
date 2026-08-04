import SwiftUI

struct WorkoutSetRow: View {
    let set: WorkoutSet
    let workoutID: String
    let onDrop: (WorkoutDragToken) -> Bool
    let onMoveUp: () -> Void
    let onMoveDown: () -> Void

    @State private var isDropTargeted = false

    var body: some View {
        HStack(spacing: 10) {
            Rectangle()
                .fill(MonsColor.surfaceRaised)
                .frame(width: 2)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 3) {
                Text(set.title)
                    .font(MonsTypography.body)
                    .bold()

                Text(set.detail)
                    .font(MonsTypography.subheadline)
                    .foregroundStyle(MonsColor.textSecondary)
            }

            Spacer()

            Text(set.value)
                .font(MonsTypography.subheadline)
                .foregroundStyle(MonsColor.textSecondary)

            Image(systemName: "line.3.horizontal")
                .foregroundStyle(MonsColor.textMuted)
                .accessibilityHidden(true)
        }
        .padding(.leading, 28)
        .padding(.trailing, 12)
        .padding(.vertical, 8)
        .frame(minHeight: 52)
        .background(
            isDropTargeted ? MonsColor.performance.opacity(0.14) : Color.clear,
            in: RoundedRectangle(cornerRadius: 10)
        )
        .contentShape(.rect)
        .draggable(WorkoutDragToken.set(workoutID: workoutID, setID: set.id).encoded)
        .dropDestination(for: String.self, action: dropItems, isTargeted: updateDropTarget)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(set.title), \(set.detail), \(set.value)")
        .accessibilityHint("Drag to reorder or move into another workout folder.")
        .accessibilityAction(named: "Move set up", onMoveUp)
        .accessibilityAction(named: "Move set down", onMoveDown)
        .animation(.easeInOut(duration: 0.15), value: isDropTargeted)
    }

    private func dropItems(_ encodedTokens: [String], at _: CGPoint) -> Bool {
        guard let encodedToken = encodedTokens.first, let token = WorkoutDragToken(encoded: encodedToken) else {
            return false
        }
        return onDrop(token)
    }

    private func updateDropTarget(_ isTargeted: Bool) {
        isDropTargeted = isTargeted
    }
}
