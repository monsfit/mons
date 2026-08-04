import Foundation
import Testing
@testable import mons

struct WorkoutRequestBuilderTests {
    @Test func buildsStableWorkoutRequestFromLoggedSets() throws {
        let exercise = try #require(ExerciseCatalog.exercise(id: "bench-press"))
        let sessionId = try #require(UUID(uuidString: "00000000-0000-0000-0000-000000000001"))
        let setId = try #require(UUID(uuidString: "00000000-0000-0000-0000-000000000002"))
        let startedAt = Date(timeIntervalSince1970: 1_000)
        let completedAt = Date(timeIntervalSince1970: 1_000 + 3_725)
        let draft = WorkoutExerciseDraft(
            exercise: exercise,
            sets: [
                WorkoutLoggingSet(
                    id: setId,
                    weightPounds: 135,
                    repetitions: 10,
                    restSeconds: 120,
                    isCompleted: true
                ),
                WorkoutLoggingSet(repetitions: 8, isCompleted: false),
            ],
            notes: "  Pause at the chest  "
        )

        let request = WorkoutRequestBuilder.request(
            title: "  Upper Body A  ",
            exercises: [draft],
            sessionId: sessionId,
            startedAt: startedAt,
            completedAt: completedAt
        )

        #expect(request.title == "Upper Body A")
        #expect(request.durationMinutes == 62)
        #expect(request.kind == .strength)
        #expect(request.sets.count == 1)
        #expect(request.sets[0].title == "Bench Press")
        #expect(request.sets[0].detail == "Set 1 · 10 reps · 2:00 rest · Pause at the chest")
        #expect(request.sets[0].value == "135 lb")
    }

    @Test func resolvesTemplatesInDeclaredOrder() throws {
        let template = try #require(ExerciseCatalog.templates.first { $0.id == "upper-body-a" })
        let exercises = ExerciseCatalog.exercises(for: template)

        #expect(exercises.map(\.id) == [
            "bench-press",
            "incline-dumbbell-press",
            "lat-pulldown",
            "seated-cable-row",
        ])
    }
}
