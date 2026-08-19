import SwiftUI

struct WorkoutBuilderView: View {
    @Environment(WorkoutCoordinator.self) private var coordinator
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    private let isEditing: Bool

    @State private var exercises: [WorkoutExerciseDraft] = []
    @State private var isPickingExercises = false
    @State private var isSaving = false
    @State private var templateId = UUID()
    @State private var title = ""

    init(template: SavedWorkoutTemplate? = nil) {
        isEditing = template != nil
        _exercises = State(initialValue: template?.exercises ?? [])
        _templateId = State(initialValue: template?.id ?? UUID())
        _title = State(initialValue: template?.name ?? "")
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: MonsSpacing.large) {
                    VStack(alignment: .leading, spacing: MonsSpacing.small) {
                        TextField("Template name", text: $title)
                            .font(MonsTypography.sectionTitle)
                            .padding(MonsSpacing.large)
                            .background(MonsColor.surface, in: .rect(cornerRadius: MonsRadius.medium))
                            .overlay {
                                RoundedRectangle(cornerRadius: MonsRadius.medium)
                                    .stroke(MonsColor.border, lineWidth: 1)
                            }

                        Text(
                            isEditing
                                ? "Update the exercises and set prescriptions in this template."
                                : "Build an exercise group once, then start it whenever you train."
                        )
                            .font(MonsTypography.subheadline)
                            .foregroundStyle(MonsColor.textSecondary)
                    }

                    Text("Exercises")
                        .font(MonsTypography.sectionTitle)

                    if exercises.isEmpty {
                        ContentUnavailableView(
                            "No exercises yet",
                            systemImage: "dumbbell",
                            description: Text("Choose exercises or begin with a starter preset.")
                        )
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, MonsSpacing.xLarge)
                    } else {
                        ForEach($exercises) { $exercise in
                            WorkoutTemplateExerciseTreeRow(
                                exercise: $exercise,
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
            .navigationTitle(isEditing ? "Edit Template" : "New Template")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.large)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close", systemImage: "xmark", action: dismiss.callAsFunction)
                }
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                MonsBottomActionBar {
                    Button(action: saveTemplate) {
                        MonsAsyncActionLabel(
                            title: isEditing ? "Save Changes" : "Save Template",
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
                    .disabled(trimmedTitle.isEmpty || exercises.isEmpty || isSaving)
                }
            }
            .sheet(isPresented: $isPickingExercises) {
                ExercisePickerView(
                    selectedIDs: Set(exercises.map(\.exercise.id)),
                    onSelectExercise: add,
                    onSelectTemplate: add
                )
            }
            .interactiveDismissDisabled(isSaving)
        }
        .tint(MonsColor.workoutAccent)
        .appToast(store.toast, onDismiss: store.dismissToast)
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

    private func saveTemplate() {
        guard !isSaving else { return }
        isSaving = true
        let template = SavedWorkoutTemplate(id: templateId, name: trimmedTitle, exercises: exercises)
        Task {
            if let saved = await store.saveWorkoutTemplate(template) {
                coordinator.prepare(saved)
                dismiss()
            }
            isSaving = false
        }
    }
}

#Preview {
    WorkoutBuilderView()
        .environment(AppStore.preview)
        .environment(WorkoutCoordinator())
}
