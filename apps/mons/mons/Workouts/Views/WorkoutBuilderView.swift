import SwiftUI

struct WorkoutBuilderView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var exercises: [WorkoutExerciseDraft] = []
    @State private var editingExerciseID: UUID?
    @State private var isPickingExercises = false
    @State private var isStartingWorkout = false
    @State private var sessionId = UUID()
    @State private var startedAt = Date.now
    @State private var title = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: MonsSpacing.large) {
                    TextField("Workout name", text: $title)
                        .font(MonsTypography.sectionTitle)
                        .padding(MonsSpacing.large)
                        .background(MonsColor.surface, in: .rect(cornerRadius: MonsRadius.medium))
                        .overlay {
                            RoundedRectangle(cornerRadius: MonsRadius.medium)
                                .stroke(MonsColor.border, lineWidth: 1)
                        }

                    Text("Selected Exercises")
                        .font(MonsTypography.sectionTitle)

                    if exercises.isEmpty {
                        ContentUnavailableView(
                            "No exercises yet",
                            systemImage: "dumbbell",
                            description: Text("Choose exercises or start from a template.")
                        )
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, MonsSpacing.xLarge)
                    } else {
                        ForEach(exercises) { exercise in
                            WorkoutExerciseSelectionRow(
                                exercise: exercise,
                                onEdit: { edit(exercise.id) },
                                onRemove: { remove(exercise.id) }
                            )
                        }
                    }

                    Button("Add Exercise", systemImage: "plus.circle", action: showExercisePicker)
                        .font(MonsTypography.headline)
                        .foregroundStyle(MonsColor.workoutAccent)
                        .frame(maxWidth: .infinity, minHeight: 52)
                        .overlay {
                            RoundedRectangle(cornerRadius: MonsRadius.medium)
                                .stroke(MonsColor.workoutAccent, style: StrokeStyle(lineWidth: 1, dash: [5]))
                        }
                }
                .padding(MonsSpacing.large)
                .padding(.bottom, 88)
            }
            .background(MonsColor.background)
            .navigationTitle("New Workout")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.large)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close", systemImage: "xmark", action: dismiss.callAsFunction)
                }
            }
            .safeAreaInset(edge: .bottom) {
                Button("Start Workout", systemImage: "play.fill", action: startWorkout)
                    .buttonStyle(
                        MonsPrimaryButtonStyle(
                            tint: MonsColor.workoutAccent,
                            foreground: MonsColor.accentForeground
                        )
                    )
                    .disabled(trimmedTitle.isEmpty || exercises.isEmpty)
                    .padding(MonsSpacing.large)
                    .background(.ultraThinMaterial)
            }
            .sheet(isPresented: $isPickingExercises) {
                ExercisePickerView(
                    selectedIDs: Set(exercises.map(\.exercise.id)),
                    onSelectExercise: add,
                    onSelectTemplate: add
                )
            }
            .navigationDestination(isPresented: $isStartingWorkout) {
                ActiveWorkoutLoggingView(
                    title: trimmedTitle,
                    initialExercises: exercises,
                    sessionId: sessionId,
                    startedAt: startedAt,
                    onSaved: dismiss.callAsFunction
                )
            }
            .navigationDestination(item: $editingExerciseID) { exerciseID in
                if let index = exercises.firstIndex(where: { $0.id == exerciseID }) {
                    ExerciseSetLoggingView(exercise: $exercises[index])
                } else {
                    ContentUnavailableView("Exercise unavailable", systemImage: "dumbbell")
                }
            }
        }
        .tint(MonsColor.workoutAccent)
    }

    private var trimmedTitle: String {
        title.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func showExercisePicker() {
        isPickingExercises = true
    }

    private func add(_ exercise: ExerciseDefinition) {
        guard !exercises.contains(where: { $0.exercise.id == exercise.id }) else { return }
        exercises.append(WorkoutExerciseDraft(exercise: exercise))
    }

    private func add(_ template: WorkoutTemplate) {
        if trimmedTitle.isEmpty {
            title = template.name
        }
        ExerciseCatalog.exercises(for: template).forEach(add)
    }

    private func remove(_ identifier: UUID) {
        exercises.removeAll { $0.id == identifier }
    }

    private func edit(_ identifier: UUID) {
        editingExerciseID = identifier
    }

    private func startWorkout() {
        sessionId = UUID()
        startedAt = .now
        isStartingWorkout = true
    }
}
