import Foundation

nonisolated struct WorkoutResponse: Decodable, Sendable {
    let workouts: [RemoteWorkout]
}
