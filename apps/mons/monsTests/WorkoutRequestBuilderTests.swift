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

    @Test func encodesRequiredNullableFieldsAsJSONNull() throws {
        let identifier = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000003"))
        let request = SaveWorkoutRequest(
            completedAt: nil,
            distanceKilometers: nil,
            durationMinutes: 6,
            kind: .strength,
            sessionId: identifier,
            sets: [],
            startedAt: Date(timeIntervalSince1970: 1_000),
            title: "Strength"
        )
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601

        let data = try encoder.encode(request)
        let payload = try #require(JSONSerialization.jsonObject(with: data) as? [String: Any])

        #expect(payload["completedAt"] is NSNull)
        #expect(payload["distanceKilometers"] is NSNull)
        #expect((payload["sets"] as? [Any])?.isEmpty == true)
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

    @Test func completedWorkoutDraftRoundTripsStableIdentifiersAndEditableFields() throws {
        let sessionId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000081"))
        let setId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000082"))
        let startedAt = Date(timeIntervalSince1970: 1_800_000_000)
        let completedAt = startedAt.addingTimeInterval(3_600)
        let session = WorkoutSession(
            id: sessionId.uuidString,
            title: "Upper Body A",
            startedAt: startedAt,
            completedAt: completedAt,
            durationMinutes: 60,
            metric: .strength(exercises: 1, sets: 1),
            sets: [
                WorkoutSet(
                    id: setId.uuidString,
                    title: "Bench Press",
                    detail: "Set 1 · 8 reps",
                    value: "135 lb"
                )
            ]
        )
        var draft = try #require(WorkoutSessionDraft(session: session))

        draft.title = "  Upper Body B  "
        draft.exercises[0].sets[0].weightPounds = 140
        let request = draft.request

        #expect(request.sessionId == sessionId)
        #expect(request.title == "Upper Body B")
        #expect(request.startedAt == startedAt)
        #expect(request.completedAt == completedAt)
        #expect(request.sets.map(\.setId) == [setId])
        #expect(request.sets.map(\.value) == ["140 lb"])
        #expect(request.sets.map(\.detail) == ["Set 1 · 8 reps · 2:00 rest"])
    }

    @Test func completedWorkoutDraftRestoresExerciseHierarchyAndSetControls() throws {
        let sessionId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000091"))
        let firstSetId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000092"))
        let secondSetId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000093"))
        let completedAt = Date(timeIntervalSince1970: 1_800_000_000)
        let session = WorkoutSession(
            id: sessionId.uuidString,
            title: "Pull",
            completedAt: completedAt,
            durationMinutes: 45,
            metric: .strength(exercises: 1, sets: 2),
            sets: [
                WorkoutSet(
                    id: firstSetId.uuidString,
                    title: "Romanian Deadlift",
                    detail: "Set 1 · 8 reps · 1:30 rest · Slow eccentric",
                    value: "185 lb"
                ),
                WorkoutSet(
                    id: secondSetId.uuidString,
                    title: "Romanian Deadlift",
                    detail: "Set 2 · 6 reps · 2:00 rest",
                    value: "90 kg"
                ),
            ]
        )

        let draft = try #require(WorkoutSessionDraft(session: session))

        #expect(draft.exercises.count == 1)
        #expect(draft.exercises[0].exercise.name == "Romanian Deadlift")
        #expect(draft.exercises[0].notes == "Slow eccentric")
        #expect(draft.exercises[0].sets.map(\.id) == [firstSetId, secondSetId])
        #expect(draft.exercises[0].sets.map(\.repetitions) == [8, 6])
        #expect(draft.exercises[0].sets.map(\.restSeconds) == [90, 120])
        #expect(draft.exercises[0].sets[0].weightPounds == 185)
        #expect(abs(draft.exercises[0].sets[1].weightPounds - 198.416) < 0.001)
    }

    @Test func completedWorkoutDraftRejectsImpossibleTiming() throws {
        let sessionId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000083"))
        let completedAt = Date(timeIntervalSince1970: 1_800_000_000)
        let session = WorkoutSession(
            id: sessionId.uuidString,
            title: "Run",
            startedAt: completedAt.addingTimeInterval(-1_800),
            completedAt: completedAt,
            durationMinutes: 30,
            metric: .cardio(distanceKilometers: 5)
        )
        var draft = try #require(WorkoutSessionDraft(session: session))

        draft.startedAt = completedAt.addingTimeInterval(60)

        #expect(!draft.isValid)
    }
}
