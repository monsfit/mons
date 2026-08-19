import Foundation

nonisolated enum WorkoutRequestBuilder {
    static func request(
        title: String,
        exercises: [WorkoutExerciseDraft],
        sessionId: UUID,
        startedAt: Date,
        completedAt: Date
    ) -> SaveWorkoutRequest {
        let sets = setRequests(exercises: exercises) { workoutSet in
            workoutSet.isCompleted && workoutSet.repetitions > 0
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
        WorkoutDurationFormatter.minuteSecond(seconds)
    }

    static func recordedSetRequests(exercises: [WorkoutExerciseDraft]) -> [SaveWorkoutSetRequest] {
        setRequests(exercises: exercises) { $0.repetitions > 0 }
    }

    private static func setRequests(
        exercises: [WorkoutExerciseDraft],
        include: (WorkoutLoggingSet) -> Bool
    ) -> [SaveWorkoutSetRequest] {
        exercises.flatMap { exercise in
            let includedSets = exercise.sets.enumerated().filter { include($0.element) }
            let note = exercise.notes.trimmingCharacters(in: .whitespacesAndNewlines)

            return includedSets.enumerated().map { includedIndex, indexedSet in
                let (index, workoutSet) = indexedSet
                let weight = workoutSet.weightPounds > 0
                    ? "\(formattedWeight(workoutSet.weightPounds)) lb"
                    : "Bodyweight"
                var details = [
                    "Set \(index + 1)",
                    "\(workoutSet.repetitions) reps",
                    "\(formattedRest(workoutSet.restSeconds)) rest",
                ]
                if includedIndex == 0, !note.isEmpty {
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
    }

    private static func formattedWeight(_ weight: Double) -> String {
        weight.formatted(.number.precision(.fractionLength(0...1)))
    }
}
