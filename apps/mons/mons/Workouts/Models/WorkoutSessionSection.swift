import Foundation

struct WorkoutSessionSection: Identifiable, Hashable {
    var id: WorkoutSessionSectionKind { kind }

    let kind: WorkoutSessionSectionKind
    let sessions: [WorkoutSession]
}
