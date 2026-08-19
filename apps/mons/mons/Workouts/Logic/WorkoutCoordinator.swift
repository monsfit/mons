import Foundation
import Observation

@Observable
@MainActor
final class WorkoutCoordinator {
    private(set) var activeWorkout: ActiveWorkoutDraft?
    private(set) var preparedTemplate: SavedWorkoutTemplate?
    var isPresentingActiveWorkout = false

    func prepare(_ template: SavedWorkoutTemplate) {
        preparedTemplate = template
    }

    func discardPreparedTemplate(_ templateId: UUID) {
        guard preparedTemplate?.id == templateId else { return }
        preparedTemplate = nil
    }

    func start(at date: Date = .now, sessionId: UUID = UUID()) {
        guard let preparedTemplate else { return }
        activeWorkout = ActiveWorkoutDraft(
            exercises: preparedTemplate.exercises,
            sessionId: sessionId,
            startedAt: date,
            templateId: preparedTemplate.id,
            title: preparedTemplate.name
        )
        isPresentingActiveWorkout = true
    }

    func presentActiveWorkout() {
        guard activeWorkout != nil else { return }
        isPresentingActiveWorkout = true
    }

    func updateExercises(_ exercises: [WorkoutExerciseDraft]) {
        activeWorkout?.exercises = exercises
    }

    func finish() {
        activeWorkout = nil
        preparedTemplate = nil
        isPresentingActiveWorkout = false
    }
}
