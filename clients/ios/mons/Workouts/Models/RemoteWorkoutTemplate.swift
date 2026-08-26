import Foundation

nonisolated struct RemoteWorkoutTemplate: Codable, Sendable {
    let exercises: [RemoteWorkoutTemplateExercise]
    let name: String
    let templateId: UUID
}

nonisolated struct RemoteWorkoutTemplateExercise: Codable, Sendable {
    let category: String
    let equipment: String
    let exerciseId: String
    let name: String
    let notes: String
    let sets: [RemoteWorkoutTemplateSet]
    let templateExerciseId: UUID
}

nonisolated struct RemoteWorkoutTemplateSet: Codable, Sendable {
    let repetitions: Int
    let restSeconds: Int
    let setId: UUID
    let weightPounds: Double
}

nonisolated struct WorkoutTemplateResponse: Decodable, Sendable {
    let templates: [RemoteWorkoutTemplate]
}
