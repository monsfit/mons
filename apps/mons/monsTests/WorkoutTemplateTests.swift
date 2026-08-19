import Foundation
import Testing
@testable import mons

@MainActor
struct WorkoutTemplateTests {
    @Test func coordinatorStartsPreparedTemplateWithInjectedIdentityAndTime() throws {
        let templateId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000060"))
        let exerciseId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000061"))
        let sessionId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000062"))
        let startedAt = Date(timeIntervalSince1970: 1_800_000_000)
        let template = SavedWorkoutTemplate(
            id: templateId,
            name: "Lower Body",
            exercises: [
                WorkoutExerciseDraft(
                    id: exerciseId,
                    exercise: ExerciseDefinition(
                        id: "barbell-squat",
                        name: "Barbell Squat",
                        category: "Lower Body",
                        equipment: "Barbell"
                    )
                )
            ]
        )
        let coordinator = WorkoutCoordinator()

        coordinator.prepare(template)
        coordinator.start(at: startedAt, sessionId: sessionId)

        #expect(coordinator.activeWorkout?.sessionId == sessionId)
        #expect(coordinator.activeWorkout?.startedAt == startedAt)
        #expect(coordinator.activeWorkout?.exercises.map(\.id) == [exerciseId])
        #expect(coordinator.isPresentingActiveWorkout)
    }

    @Test func dismissingPresentationKeepsTheWorkoutActive() throws {
        let templateId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000063"))
        let sessionId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000064"))
        let coordinator = WorkoutCoordinator()

        coordinator.prepare(
            SavedWorkoutTemplate(id: templateId, name: "Push", exercises: [])
        )
        coordinator.start(at: Date(timeIntervalSince1970: 1_800_000_000), sessionId: sessionId)
        coordinator.isPresentingActiveWorkout = false

        #expect(coordinator.activeWorkout?.sessionId == sessionId)
        #expect(!coordinator.isPresentingActiveWorkout)
    }

    @Test func saveRequestPreservesExerciseAndSetOrderAndIdentifiers() throws {
        let templateId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000070"))
        let exerciseId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000071"))
        let firstSetId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000072"))
        let secondSetId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000073"))
        let template = SavedWorkoutTemplate(
            id: templateId,
            name: "Push",
            exercises: [
                WorkoutExerciseDraft(
                    id: exerciseId,
                    exercise: ExerciseDefinition(
                        id: "bench-press",
                        name: "Bench Press",
                        category: "Chest",
                        equipment: "Barbell"
                    ),
                    sets: [
                        WorkoutLoggingSet(id: firstSetId, repetitions: 8),
                        WorkoutLoggingSet(id: secondSetId, repetitions: 6),
                    ]
                )
            ]
        )

        let request = SaveWorkoutTemplateRequest(template: template)

        #expect(request.templateId == templateId)
        #expect(request.exercises.map(\.templateExerciseId) == [exerciseId])
        #expect(request.exercises[0].sets.map(\.setId) == [firstSetId, secondSetId])
        #expect(request.exercises[0].sets.map(\.repetitions) == [8, 6])
    }

    @Test func deletingPreparedTemplateClearsOnlyMatchingPreparation() throws {
        let firstId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000074"))
        let secondId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000075"))
        let coordinator = WorkoutCoordinator()

        coordinator.prepare(SavedWorkoutTemplate(id: firstId, name: "Push", exercises: []))
        coordinator.discardPreparedTemplate(secondId)
        #expect(coordinator.preparedTemplate?.id == firstId)

        coordinator.discardPreparedTemplate(firstId)
        #expect(coordinator.preparedTemplate == nil)
    }
}
