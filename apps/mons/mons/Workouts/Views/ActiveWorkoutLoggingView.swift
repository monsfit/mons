import SwiftUI

struct ActiveWorkoutLoggingView: View {
    @Environment(AppStore.self) private var store

    @State private var exercises: [WorkoutExerciseDraft]
    @State private var isSaving = false

    let title: String
    let sessionId: UUID
    let startedAt: Date
    let onSaved: () -> Void

    init(
        title: String,
        initialExercises: [WorkoutExerciseDraft],
        sessionId: UUID,
        startedAt: Date,
        onSaved: @escaping () -> Void
    ) {
        self.title = title
        _exercises = State(initialValue: initialExercises)
        self.sessionId = sessionId
        self.startedAt = startedAt
        self.onSaved = onSaved
    }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: MonsSpacing.large) {
                HStack {
                    VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                        Text(title)
                            .font(MonsTypography.display)
                        Text("Strength · \(exercises.count) exercises")
                            .font(MonsTypography.body)
                            .foregroundStyle(MonsColor.textSecondary)
                    }

                    Spacer()

                    WorkoutElapsedTimeLabel(startedAt: startedAt)
                }

                Text("Exercises")
                    .font(MonsTypography.sectionTitle)

                ForEach(Array(exercises.enumerated()), id: \.element.id) { index, exercise in
                    NavigationLink(value: exercise.id) {
                        WorkoutExerciseProgressRow(exercise: exercise, index: index + 1)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(MonsSpacing.large)
            .padding(.bottom, 88)
        }
        .background(MonsColor.background)
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .safeAreaInset(edge: .bottom) {
            Button("Finish Workout", systemImage: "checkmark.circle.fill", action: finishWorkout)
                .buttonStyle(
                    MonsPrimaryButtonStyle(
                        tint: MonsColor.workoutAccent,
                        foreground: MonsColor.accentForeground
                    )
                )
                .disabled(isSaving)
                .padding(MonsSpacing.large)
                .background(.ultraThinMaterial)
        }
        .navigationDestination(for: UUID.self) { exerciseID in
            if let index = exercises.firstIndex(where: { $0.id == exerciseID }) {
                ExerciseSetLoggingView(exercise: $exercises[index])
            } else {
                ContentUnavailableView("Exercise unavailable", systemImage: "dumbbell")
            }
        }
    }

    private func finishWorkout() {
        guard !isSaving else { return }
        isSaving = true
        let request = WorkoutRequestBuilder.request(
            title: title,
            exercises: exercises,
            sessionId: sessionId,
            startedAt: startedAt,
            completedAt: .now
        )
        Task {
            let saved = await store.saveWorkout(request)
            isSaving = false
            if saved {
                onSaved()
            }
        }
    }
}
