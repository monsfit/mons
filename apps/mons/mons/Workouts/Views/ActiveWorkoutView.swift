import SwiftUI

struct ActiveWorkoutView: View {
    @State private var sessions: [WorkoutSession]
    @State private var expandedSessionIDs: Set<String>

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    init(workout: WorkoutSession) {
        _sessions = State(initialValue: [workout])
        _expandedSessionIDs = State(initialValue: [workout.id])
    }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 12) {
                HStack {
                    Label("In progress", systemImage: "timer")
                        .foregroundStyle(.tint)

                    Spacer()

                    Text("\(sessions.first?.sets.count ?? 0) items")
                        .foregroundStyle(.secondary)
                }
                .font(.subheadline)

                Divider()

                WorkoutHierarchyList(
                    sessions: sessions,
                    expandedSessionIDs: expandedSessionIDs,
                    onToggle: toggleWorkout,
                    onDropOnWorkout: dropOnWorkout,
                    onDropOnSet: dropOnSet,
                    onMoveWorkout: moveWorkout,
                    onMoveSet: moveSet
                )
            }
            .padding(.horizontal)
            .padding(.bottom, 100)
        }
        .navigationTitle("Active Workout")
    }

    private func toggleWorkout(_ identifier: String) {
        if expandedSessionIDs.contains(identifier) {
            expandedSessionIDs.remove(identifier)
        } else {
            expandedSessionIDs.insert(identifier)
        }
    }

    private func dropOnWorkout(_ token: WorkoutDragToken, targetWorkoutID: String) -> Bool {
        let updated: [WorkoutSession]?

        switch token {
        case .workout(let workoutID):
            updated = WorkoutHierarchyEditor.movingWorkout(
                workoutID,
                before: targetWorkoutID,
                in: sessions
            )
        case .set(let sourceWorkoutID, let setID):
            updated = WorkoutHierarchyEditor.movingSet(
                setID,
                from: sourceWorkoutID,
                to: targetWorkoutID,
                before: nil,
                in: sessions
            )
            expandedSessionIDs.insert(targetWorkoutID)
        }

        guard let updated else { return false }
        updateSessions(updated)
        return true
    }

    private func dropOnSet(
        _ token: WorkoutDragToken,
        targetWorkoutID: String,
        targetSetID: String
    ) -> Bool {
        guard case .set(let sourceWorkoutID, let setID) = token else { return false }

        guard let updated = WorkoutHierarchyEditor.movingSet(
            setID,
            from: sourceWorkoutID,
            to: targetWorkoutID,
            before: targetSetID,
            in: sessions
        ) else {
            return false
        }

        updateSessions(updated)
        return true
    }

    private func moveWorkout(_ identifier: String, offset: Int) {
        guard let sourceIndex = sessions.firstIndex(where: { $0.id == identifier }) else { return }
        let destinationIndex = sourceIndex + offset
        guard sessions.indices.contains(destinationIndex) else { return }

        var updated = sessions
        updated.swapAt(sourceIndex, destinationIndex)
        updateSessions(updated)
    }

    private func moveSet(_ workoutID: String, setID: String, offset: Int) {
        guard
            let workoutIndex = sessions.firstIndex(where: { $0.id == workoutID }),
            let sourceIndex = sessions[workoutIndex].sets.firstIndex(where: { $0.id == setID })
        else {
            return
        }

        let destinationIndex = sourceIndex + offset
        guard sessions[workoutIndex].sets.indices.contains(destinationIndex) else { return }

        var updated = sessions
        var sets = updated[workoutIndex].sets
        sets.swapAt(sourceIndex, destinationIndex)
        updated[workoutIndex] = updated[workoutIndex].replacingSets(with: sets)
        updateSessions(updated)
    }

    private func updateSessions(_ updated: [WorkoutSession]) {
        if reduceMotion {
            sessions = updated
        } else {
            withAnimation(.snappy) {
                sessions = updated
            }
        }
    }
}
