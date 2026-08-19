import SwiftUI

struct WorkoutSessionEditorView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var draft: WorkoutSessionDraft
    @State private var isPickingExercises = false
    @State private var isSaving = false

    init(draft: WorkoutSessionDraft) {
        _draft = State(initialValue: draft)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Workout") {
                    TextField("Workout name", text: $draft.title)

                    Picker("Type", selection: $draft.kind) {
                        ForEach(WorkoutKind.allCases) { kind in
                            Label(kind.title, systemImage: kind.systemImage)
                                .tag(kind)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section("Timing") {
                    DatePicker("Started", selection: $draft.startedAt)
                    DatePicker("Completed", selection: $draft.completedAt)
                    TextField("Duration", value: $draft.durationMinutes, format: .number)
                        #if os(iOS)
                        .keyboardType(.numberPad)
                        #endif
                }

                if draft.kind == .cardio {
                    Section("Distance") {
                        TextField(
                            "Kilometers",
                            value: $draft.distanceKilometers,
                            format: .number.precision(.fractionLength(0...2))
                        )
                        #if os(iOS)
                        .keyboardType(.decimalPad)
                        #endif
                    }
                }

                if draft.kind == .strength {
                    Section("Exercises") {
                        if draft.exercises.isEmpty {
                            ContentUnavailableView(
                                "No recorded exercises",
                                systemImage: "dumbbell",
                                description: Text("Add an exercise, then record its sets.")
                            )
                        }

                        ForEach($draft.exercises) { $exercise in
                            WorkoutTemplateExerciseTreeRow(
                                exercise: $exercise,
                                onRemove: { removeExercise(exercise.id) }
                            )
                            .listRowInsets(EdgeInsets())
                            .listRowBackground(Color.clear)
                        }

                        Button("Add Exercise", systemImage: "plus.circle") {
                            isPickingExercises = true
                        }
                    }
                }
            }
            .monsGroupedContent()
            .navigationTitle("Edit Workout")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: dismiss.callAsFunction)
                }
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                MonsBottomActionBar {
                    Button(action: save) {
                        MonsAsyncActionLabel(
                            title: "Save Changes",
                            loadingTitle: "Saving…",
                            systemImage: "checkmark",
                            isLoading: isSaving
                        )
                    }
                    .buttonStyle(
                        MonsPrimaryButtonStyle(
                            tint: MonsColor.workoutAccent,
                            foreground: MonsColor.accentForeground
                        )
                    )
                    .disabled(!draft.isValid || isSaving)
                }
            }
            .interactiveDismissDisabled(isSaving)
            .sheet(isPresented: $isPickingExercises) {
                ExercisePickerView(
                    selectedIDs: Set(draft.exercises.map(\.exercise.id)),
                    onSelectExercise: addExercise,
                    onSelectTemplate: addTemplate
                )
            }
        }
        .tint(MonsColor.workoutAccent)
    }

    private func addExercise(_ exercise: ExerciseDefinition) {
        draft.addExercise(exercise)
    }

    private func addTemplate(_ template: WorkoutTemplate) {
        ExerciseCatalog.exercises(for: template).forEach(addExercise)
    }

    private func removeExercise(_ identifier: UUID) {
        draft.removeExercise(id: identifier)
    }

    private func save() {
        guard draft.isValid, !isSaving else { return }
        isSaving = true
        let request = draft.request
        Task {
            let saved = await store.saveWorkout(request)
            isSaving = false
            if saved {
                dismiss()
            }
        }
    }
}
