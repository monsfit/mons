import SwiftUI

struct WorkoutHierarchyList: View {
    let sessions: [WorkoutSession]
    let expandedSessionIDs: Set<String>
    let onToggle: (String) -> Void
    let onDropOnWorkout: (WorkoutDragToken, String) -> Bool
    let onDropOnSet: (WorkoutDragToken, String, String) -> Bool
    let onMoveWorkout: (String, Int) -> Void
    let onMoveSet: (String, String, Int) -> Void

    var body: some View {
        LazyVStack(spacing: 2) {
            ForEach(sessions) { session in
                WorkoutFolderRow(
                    session: session,
                    isExpanded: expandedSessionIDs.contains(session.id),
                    onToggle: { onToggle(session.id) },
                    onDrop: { onDropOnWorkout($0, session.id) },
                    onMoveUp: { onMoveWorkout(session.id, -1) },
                    onMoveDown: { onMoveWorkout(session.id, 1) }
                )

                if expandedSessionIDs.contains(session.id) {
                    ForEach(session.sets) { set in
                        WorkoutSetRow(
                            set: set,
                            workoutID: session.id,
                            onDrop: { onDropOnSet($0, session.id, set.id) },
                            onMoveUp: { onMoveSet(session.id, set.id, -1) },
                            onMoveDown: { onMoveSet(session.id, set.id, 1) }
                        )
                    }
                }

                Divider()
            }
        }
    }
}
