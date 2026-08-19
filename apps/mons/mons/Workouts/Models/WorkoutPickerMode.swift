import Foundation

enum WorkoutPickerMode: String, CaseIterable, Identifiable {
    case exercises = "Exercises"
    case templates = "Templates"

    var id: Self { self }
}
