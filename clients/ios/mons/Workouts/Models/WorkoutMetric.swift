import Foundation

nonisolated enum WorkoutMetric: Hashable, Sendable {
    case strength(exercises: Int, sets: Int)
    case cardio(distanceKilometers: Double)

    var kind: WorkoutKind {
        switch self {
        case .strength:
            .strength
        case .cardio:
            .cardio
        }
    }

    var summary: String {
        switch self {
        case .strength(let exercises, let sets):
            "\(exercises) exercises · \(sets) sets"
        case .cardio(let distanceKilometers):
            "\(distanceKilometers.formatted(.number.precision(.fractionLength(1)))) km"
        }
    }
}
