import Foundation

enum WorkoutDestination: Hashable {
    case muscleMap
    case session(WorkoutSession)
    case template(SavedWorkoutTemplate)
}
