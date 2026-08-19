import Foundation

nonisolated enum ExerciseCatalog {
    static let exercises = [
        ExerciseDefinition(id: "barbell-squat", name: "Barbell Squat", category: "Lower Body", equipment: "Barbell"),
        ExerciseDefinition(id: "bench-press", name: "Bench Press", category: "Chest", equipment: "Barbell"),
        ExerciseDefinition(id: "romanian-deadlift", name: "Romanian Deadlift", category: "Posterior Chain", equipment: "Barbell"),
        ExerciseDefinition(id: "pull-up", name: "Pull-Up", category: "Upper Body", equipment: "Bodyweight"),
        ExerciseDefinition(id: "overhead-press", name: "Overhead Press", category: "Shoulders", equipment: "Barbell"),
        ExerciseDefinition(id: "incline-dumbbell-press", name: "Incline Dumbbell Press", category: "Upper Chest", equipment: "Dumbbells"),
        ExerciseDefinition(id: "lat-pulldown", name: "Lat Pulldown", category: "Back", equipment: "Cable"),
        ExerciseDefinition(id: "seated-cable-row", name: "Seated Cable Row", category: "Back", equipment: "Cable"),
        ExerciseDefinition(id: "lateral-raise", name: "Lateral Raise", category: "Shoulders", equipment: "Dumbbells"),
        ExerciseDefinition(id: "triceps-pushdown", name: "Triceps Pushdown", category: "Arms", equipment: "Cable"),
        ExerciseDefinition(id: "barbell-row", name: "Barbell Row", category: "Back", equipment: "Barbell"),
        ExerciseDefinition(id: "walking-lunge", name: "Walking Lunge", category: "Lower Body", equipment: "Dumbbells"),
    ]

    static let templates = [
        WorkoutTemplate(
            id: "upper-body-a",
            name: "Upper Body A",
            exerciseIDs: ["bench-press", "incline-dumbbell-press", "lat-pulldown", "seated-cable-row"]
        ),
        WorkoutTemplate(
            id: "lower-body-a",
            name: "Lower Body A",
            exerciseIDs: ["barbell-squat", "romanian-deadlift", "walking-lunge"]
        ),
        WorkoutTemplate(
            id: "push",
            name: "Push",
            exerciseIDs: ["bench-press", "overhead-press", "lateral-raise", "triceps-pushdown"]
        ),
    ]

    static func exercise(id: String) -> ExerciseDefinition? {
        exercises.first { $0.id == id }
    }

    static func exercises(for template: WorkoutTemplate) -> [ExerciseDefinition] {
        template.exerciseIDs.compactMap(exercise(id:))
    }
}
