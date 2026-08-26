import Foundation

enum WorkoutDestination: Hashable {
    case session(WorkoutSession)
    case template(SavedWorkoutTemplate)
}
