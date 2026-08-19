import SwiftUI

struct WorkoutTemplateDetailView: View {
    @Environment(AppStore.self) private var store
    @Environment(WorkoutCoordinator.self) private var coordinator
    @Environment(\.dismiss) private var dismiss

    let initialTemplate: SavedWorkoutTemplate

    @State private var editingTemplate: SavedWorkoutTemplate?
    @State private var isConfirmingDelete = false
    @State private var isDeleting = false

    private var template: SavedWorkoutTemplate {
        store.workoutTemplates.first { $0.id == initialTemplate.id } ?? initialTemplate
    }

    private var setCount: Int {
        template.exercises.reduce(0) { $0 + $1.sets.count }
    }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: MonsSpacing.large) {
                MonsCard {
                    VStack(alignment: .leading, spacing: MonsSpacing.large) {
                        Label("Workout Template", systemImage: "list.bullet.rectangle.portrait")
                            .font(MonsTypography.headline)
                            .foregroundStyle(MonsColor.workoutAccent)

                        Text(template.name)
                            .font(MonsTypography.display)

                        HStack(spacing: MonsSpacing.large) {
                            LabeledContent("Exercises", value: template.exercises.count, format: .number)
                            LabeledContent("Sets", value: setCount, format: .number)
                        }
                    }
                }

                Text("Exercises")
                    .font(MonsTypography.sectionTitle)

                if template.exercises.isEmpty {
                    ContentUnavailableView(
                        "No exercises",
                        systemImage: "dumbbell",
                        description: Text("Edit this template to add its first exercise.")
                    )
                } else {
                    ForEach(template.exercises) { exercise in
                        WorkoutTemplateExerciseDetailRow(exercise: exercise)
                    }
                }
            }
            .padding(MonsSpacing.large)
            .padding(.bottom, 88)
        }
        .background(MonsColor.background)
        .navigationTitle("Template Details")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu("Template actions", systemImage: "ellipsis") {
                    Button("Edit Template", systemImage: "pencil", action: edit)
                    Button("Delete Template", systemImage: "trash", role: .destructive) {
                        isConfirmingDelete = true
                    }
                }
            }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            MonsBottomActionBar {
                Button("Prepare Workout", systemImage: "play.fill", action: prepare)
                    .buttonStyle(
                        MonsPrimaryButtonStyle(
                            tint: MonsColor.workoutAccent,
                            foreground: MonsColor.accentForeground
                        )
                    )
                    .disabled(isDeleting || template.exercises.isEmpty)
            }
        }
        .confirmationDialog(
            "Delete \(template.name)?",
            isPresented: $isConfirmingDelete,
            titleVisibility: .visible
        ) {
            Button("Delete Template", role: .destructive, action: delete)
        } message: {
            Text("This removes the reusable template. Completed workouts are unchanged.")
        }
        #if os(iOS)
        .fullScreenCover(item: $editingTemplate) { template in
            WorkoutBuilderView(template: template)
        }
        #else
        .sheet(item: $editingTemplate) { template in
            WorkoutBuilderView(template: template)
        }
        #endif
        .overlay {
            if isDeleting {
                ProgressView("Deleting template…")
                    .padding(MonsSpacing.large)
                    .background(.regularMaterial, in: .rect(cornerRadius: MonsRadius.medium))
            }
        }
        .tint(MonsColor.workoutAccent)
    }

    private func edit() {
        editingTemplate = template
    }

    private func prepare() {
        coordinator.prepare(template)
        store.showSuccess("Workout ready")
    }

    private func delete() {
        guard !isDeleting else { return }
        isDeleting = true
        let templateId = template.id
        Task {
            let deleted = await store.deleteWorkoutTemplate(templateId)
            isDeleting = false
            if deleted {
                coordinator.discardPreparedTemplate(templateId)
                dismiss()
            }
        }
    }
}
