import Foundation

enum WorkoutHierarchyEditor {
    static func movingWorkout(
        _ identifier: String,
        before targetIdentifier: String,
        in sessions: [WorkoutSession]
    ) -> [WorkoutSession]? {
        guard
            identifier != targetIdentifier,
            let sourceIndex = sessions.firstIndex(where: { $0.id == identifier }),
            sessions.contains(where: { $0.id == targetIdentifier })
        else {
            return nil
        }

        var updated = sessions
        let session = updated.remove(at: sourceIndex)
        guard let targetIndex = updated.firstIndex(where: { $0.id == targetIdentifier }) else {
            return nil
        }
        updated.insert(session, at: targetIndex)
        return updated
    }

    static func movingSet(
        _ setIdentifier: String,
        from sourceWorkoutIdentifier: String,
        to destinationWorkoutIdentifier: String,
        before targetSetIdentifier: String?,
        in sessions: [WorkoutSession]
    ) -> [WorkoutSession]? {
        guard
            setIdentifier != targetSetIdentifier,
            let sourceWorkoutIndex = sessions.firstIndex(where: { $0.id == sourceWorkoutIdentifier }),
            let sourceSetIndex = sessions[sourceWorkoutIndex].sets.firstIndex(where: { $0.id == setIdentifier }),
            let destinationWorkoutIndex = sessions.firstIndex(where: { $0.id == destinationWorkoutIdentifier })
        else {
            return nil
        }

        var updated = sessions
        let movedSet = updated[sourceWorkoutIndex].sets[sourceSetIndex]
        var sourceSets = updated[sourceWorkoutIndex].sets
        sourceSets.remove(at: sourceSetIndex)
        updated[sourceWorkoutIndex] = updated[sourceWorkoutIndex].replacingSets(with: sourceSets)

        var destinationSets = updated[destinationWorkoutIndex].sets
        let insertionIndex = targetSetIdentifier.flatMap { identifier in
            destinationSets.firstIndex(where: { $0.id == identifier })
        } ?? destinationSets.endIndex
        destinationSets.insert(movedSet, at: insertionIndex)
        updated[destinationWorkoutIndex] = updated[destinationWorkoutIndex].replacingSets(with: destinationSets)
        return updated
    }
}
