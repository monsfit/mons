import Foundation

nonisolated struct SaveWorkoutTemplateRequest: Encodable, Sendable {
    let exercises: [SaveWorkoutTemplateExerciseRequest]
    let name: String
    let templateId: UUID

    init(template: SavedWorkoutTemplate) {
        exercises = template.exercises.map(SaveWorkoutTemplateExerciseRequest.init)
        name = template.name
        templateId = template.id
    }
}

nonisolated struct SaveWorkoutTemplateExerciseRequest: Encodable, Sendable {
    let category: String
    let equipment: String
    let exerciseId: String
    let name: String
    let notes: String
    let sets: [SaveWorkoutTemplateSetRequest]
    let templateExerciseId: UUID

    init(exercise: WorkoutExerciseDraft) {
        category = exercise.exercise.category
        equipment = exercise.exercise.equipment
        exerciseId = exercise.exercise.id
        name = exercise.exercise.name
        notes = exercise.notes
        sets = exercise.sets.map(SaveWorkoutTemplateSetRequest.init)
        templateExerciseId = exercise.id
    }
}

nonisolated struct SaveWorkoutTemplateSetRequest: Encodable, Sendable {
    let repetitions: Int
    let restSeconds: Int
    let setId: UUID
    let weightPounds: Double

    init(workoutSet: WorkoutLoggingSet) {
        repetitions = workoutSet.repetitions
        restSeconds = workoutSet.restSeconds
        setId = workoutSet.id
        weightPounds = workoutSet.weightPounds
    }
}
