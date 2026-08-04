import Foundation

nonisolated enum WorkoutRequestBuilder {
    static func request(
        title: String,
        exercises: [WorkoutExerciseDraft],
        sessionId: UUID,
        startedAt: Date,
        completedAt: Date
    ) -> SaveWorkoutRequest {
        let sets: [SaveWorkoutSetRequest] = exercises.flatMap { exercise in
            let completedSets = exercise.sets.enumerated().filter {
                $0.element.isCompleted && $0.element.repetitions > 0
            }
            let note = exercise.notes.trimmingCharacters(in: .whitespacesAndNewlines)

            return completedSets.enumerated().map { completedIndex, indexedSet in
                let (index, workoutSet) = indexedSet
                let weight = workoutSet.weightPounds > 0
                    ? "\(formattedWeight(workoutSet.weightPounds)) lb"
                    : "Bodyweight"
                var details = [
                    "Set \(index + 1)",
                    "\(workoutSet.repetitions) reps",
                    "\(formattedRest(workoutSet.restSeconds)) rest",
                ]
                if completedIndex == 0, !note.isEmpty {
                    details.append(note)
                }
                return SaveWorkoutSetRequest(
                    detail: details.joined(separator: " · "),
                    setId: workoutSet.id,
                    title: exercise.exercise.name,
                    value: weight
                )
            }
        }

        let duration = max(Int(completedAt.timeIntervalSince(startedAt) / 60), 0)
        return SaveWorkoutRequest(
            completedAt: completedAt,
            distanceKilometers: nil,
            durationMinutes: duration,
            kind: .strength,
            sessionId: sessionId,
            sets: sets,
            startedAt: startedAt,
            title: title.trimmingCharacters(in: .whitespacesAndNewlines)
        )
    }

    static func formattedRest(_ seconds: Int) -> String {
        let safeSeconds = max(seconds, 0)
        return "\(safeSeconds / 60):\(String(format: "%02d", safeSeconds % 60))"
    }

    private static func formattedWeight(_ weight: Double) -> String {
        weight.formatted(.number.precision(.fractionLength(0...1)))
    }
}
