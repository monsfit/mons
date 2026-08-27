import SwiftUI

struct WorkoutSessionDetailView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    let initialSession: WorkoutSession

    @State private var editorDraft: WorkoutSessionDraft?
    @State private var isConfirmingDelete = false
    @State private var isDeleting = false

    private var session: WorkoutSession {
        store.workouts.first { $0.id == initialSession.id } ?? initialSession
    }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: MonsSpacing.large) {
                MonsCard {
                    VStack(alignment: .leading, spacing: MonsSpacing.large) {
                        Label(session.metric.kind.title, systemImage: session.metric.kind.systemImage)
                            .font(MonsTypography.headline)
                            .foregroundStyle(MonsColor.workoutAccent)

                        Text(session.title)
                            .font(MonsTypography.display)

                        LabeledContent("Completed") {
                            Text(session.completedAt, format: .dateTime.month(.abbreviated).day().year().hour().minute())
                        }
                        LabeledContent("Duration", value: "\(session.durationMinutes) min")
                        LabeledContent("Summary", value: session.metric.summary)
                    }
                }

                Text("Recorded Sets")
                    .font(MonsTypography.sectionTitle)

                if session.sets.isEmpty {
                    ContentUnavailableView(
                        "No sets recorded",
                        systemImage: session.metric.kind.systemImage,
                        description: Text("This workout was saved without individual set details.")
                    )
                } else {
                    ForEach(session.sets.enumerated(), id: \.element.id) { index, workoutSet in
                        MonsCard {
                            HStack(alignment: .top, spacing: MonsSpacing.medium) {
                                Text(index + 1, format: .number)
                                    .font(MonsTypography.headline)
                                    .foregroundStyle(MonsColor.textSecondary)
                                    .frame(minWidth: 24)

                                VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                                    Text(workoutSet.title)
                                        .font(MonsTypography.headline)
                                    Text(workoutSet.detail)
                                        .font(MonsTypography.subheadline)
                                        .foregroundStyle(MonsColor.textSecondary)
                                }

                                Spacer()

                                Text(workoutSet.value)
                                    .font(MonsTypography.subheadline)
                                    .foregroundStyle(MonsColor.textSecondary)
                            }
                        }
                    }
                }
            }
            .padding(MonsSpacing.large)
        }
        .background(MonsColor.background)
        .navigationTitle("Workout Details")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu("Workout actions", systemImage: "ellipsis") {
                    if WorkoutSessionDraft(session: session) != nil {
                        Button("Edit Workout", systemImage: "pencil", action: edit)
                    }
                    Button("Delete Workout", systemImage: "trash", role: .destructive) {
                        isConfirmingDelete = true
                    }
                }
            }
        }
        .confirmationDialog(
            "Delete \(session.title)?",
            isPresented: $isConfirmingDelete,
            titleVisibility: .visible
        ) {
            Button("Delete Workout", role: .destructive, action: delete)
        } message: {
            Text("This permanently removes the completed workout and its recorded sets.")
        }
        .sheet(item: $editorDraft) { draft in
            WorkoutSessionEditorView(draft: draft)
        }
        .overlay {
            if isDeleting {
                ProgressView("Deleting workout…")
                    .padding(MonsSpacing.large)
                    .background(.regularMaterial, in: .rect(cornerRadius: MonsRadius.medium))
            }
        }
        .tint(MonsColor.workoutAccent)
    }

    private func edit() {
        editorDraft = WorkoutSessionDraft(session: session)
    }

    private func delete() {
        guard let sessionId = UUID(uuidString: session.id), !isDeleting else { return }
        isDeleting = true
        Task {
            let deleted = await store.deleteWorkout(sessionId)
            isDeleting = false
            if deleted {
                dismiss()
            }
        }
    }
}
