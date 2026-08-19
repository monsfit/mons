import Foundation
import Testing
@testable import mons

struct WorkoutExerciseDraftTests {
    @Test func addingSetCopiesThePreviousPrescriptionDeterministically() {
        let existingID = UUID(uuidString: "00000000-0000-0000-0000-000000000001")!
        let addedID = UUID(uuidString: "00000000-0000-0000-0000-000000000002")!
        var draft = WorkoutExerciseDraft(
            exercise: exercise,
            sets: [
                WorkoutLoggingSet(
                    id: existingID,
                    weightPounds: 135,
                    repetitions: 6,
                    restSeconds: 180,
                    isCompleted: true
                )
            ]
        )

        draft.addSet(id: addedID)

        #expect(draft.sets.map(\.id) == [existingID, addedID])
        #expect(draft.sets[1].weightPounds == 135)
        #expect(draft.sets[1].repetitions == 6)
        #expect(draft.sets[1].restSeconds == 180)
        #expect(draft.sets[1].isCompleted == false)
    }

    @Test func addingFirstSetUsesStableDefaults() {
        let addedID = UUID(uuidString: "00000000-0000-0000-0000-000000000003")!
        var draft = WorkoutExerciseDraft(exercise: exercise, sets: [])

        draft.addSet(id: addedID)

        #expect(draft.sets == [
            WorkoutLoggingSet(
                id: addedID,
                weightPounds: 0,
                repetitions: 8,
                restSeconds: 120
            )
        ])
    }

    @Test func removingSetPreservesTheOrderOfRemainingSets() {
        let firstID = UUID(uuidString: "00000000-0000-0000-0000-000000000004")!
        let removedID = UUID(uuidString: "00000000-0000-0000-0000-000000000005")!
        let lastID = UUID(uuidString: "00000000-0000-0000-0000-000000000006")!
        var draft = WorkoutExerciseDraft(
            exercise: exercise,
            sets: [
                WorkoutLoggingSet(id: firstID),
                WorkoutLoggingSet(id: removedID),
                WorkoutLoggingSet(id: lastID)
            ]
        )

        draft.removeSet(id: removedID)

        #expect(draft.sets.map(\.id) == [firstID, lastID])
    }

    private var exercise: ExerciseDefinition {
        ExerciseDefinition(
            id: "barbell-bench-press",
            name: "Barbell Bench Press",
            category: "Chest",
            equipment: "Barbell"
        )
    }
}
