import SwiftUI

struct WorkoutFolderRow: View {
    let session: WorkoutSession
    let isExpanded: Bool
    let onToggle: () -> Void
    let onDrop: (WorkoutDragToken) -> Bool
    let onMoveUp: () -> Void
    let onMoveDown: () -> Void

    @State private var isDropTargeted = false

    var body: some View {
        Button(action: onToggle) {
            HStack(spacing: 12) {
                Image(systemName: isExpanded ? "folder.fill.badge.minus" : "folder.fill")
                    .font(MonsTypography.sectionTitle)
                    .foregroundStyle(MonsColor.metric)
                    .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 3) {
                    Text(session.title)
                        .font(MonsTypography.headline)

                    Text("\(session.metric.summary) · \(session.durationMinutes) min")
                        .font(MonsTypography.subheadline)
                        .foregroundStyle(MonsColor.textSecondary)
                }

                Spacer()

                Image(systemName: "line.3.horizontal")
                    .foregroundStyle(MonsColor.textSecondary)
                    .accessibilityHidden(true)

                Image(systemName: "chevron.right")
                    .font(MonsTypography.subheadline)
                    .foregroundStyle(MonsColor.textSecondary)
                    .rotationEffect(.degrees(isExpanded ? 90 : 0))
                    .accessibilityHidden(true)
            }
            .padding(.vertical, 10)
            .padding(.horizontal, 12)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .background(
            isDropTargeted ? MonsColor.action.opacity(0.14) : Color.clear,
            in: RoundedRectangle(cornerRadius: 12)
        )
        .overlay {
            RoundedRectangle(cornerRadius: 12)
                .stroke(
                    isDropTargeted ? MonsColor.action : .clear,
                    style: StrokeStyle(lineWidth: 1.5, dash: [5, 5])
                )
        }
        .draggable(WorkoutDragToken.workout(session.id).encoded)
        .dropDestination(for: String.self, action: dropItems, isTargeted: updateDropTarget)
        .accessibilityLabel("\(session.title), workout folder")
        .accessibilityValue("\(session.sets.count) items, \(isExpanded ? "expanded" : "collapsed")")
        .accessibilityAction(named: "Move workout up", onMoveUp)
        .accessibilityAction(named: "Move workout down", onMoveDown)
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
