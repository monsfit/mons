import SwiftUI

struct WorkoutListView: View {
    @Environment(AppStore.self) private var store
    @Environment(WorkoutCoordinator.self) private var coordinator

    @State private var deletingTemplateIDs: Set<UUID> = []
    @State private var isShowingBuilder = false
    @State private var path: [WorkoutDestination] = []

    private let referenceDate: Date
    private let calendar: Calendar
    private let previewSessions: [WorkoutSession]?

    init(
        referenceDate: Date = .now,
        calendar: Calendar = .current,
        sessions: [WorkoutSession]? = nil
    ) {
        self.referenceDate = referenceDate
        self.calendar = calendar
        previewSessions = sessions
    }

    private var sessions: [WorkoutSession] {
        previewSessions ?? store.workouts
    }

    private var sections: [WorkoutSessionSection] {
        WorkoutSessionGrouper.sections(
            for: sessions,
            referenceDate: referenceDate,
            calendar: calendar
        )
    }

    private var weeklySummary: WorkoutWeeklySummary {
        WorkoutAnalytics.weeklySummary(
            for: sessions,
            referenceDate: referenceDate,
            calendar: calendar
        )
    }

    var body: some View {
        NavigationStack(path: $path) {
            List {
                Section("This week") {
                    WorkoutWeeklySummaryRow(summary: weeklySummary)
                }

                Section {
                    if store.isLoadingWorkoutTemplates && store.workoutTemplates.isEmpty {
                        ProgressView("Loading templates…")
                    } else if store.workoutTemplates.isEmpty {
                        Button("Create your first template", systemImage: "plus", action: showWorkoutBuilder)
                    } else {
                        ForEach(store.workoutTemplates) { template in
                            SavedWorkoutTemplateRow(
                                isDeleting: deletingTemplateIDs.contains(template.id),
                                template: template,
                                onPrepare: { coordinator.prepare(template) },
                                onSelect: { path.append(.template(template)) }
                            )
                            .swipeActions {
                                Button("Delete", systemImage: "trash", role: .destructive) {
                                    delete(template.id)
                                }
                            }
                        }
                    }
                } header: {
                    HStack {
                        Text("Templates")
                        Spacer()
                        if store.isLoadingWorkoutTemplates {
                            ProgressView()
                                .controlSize(.small)
                        }
                    }
                }

                if store.isLoadingWorkouts && sections.isEmpty {
                    Section {
                        ProgressView("Loading workouts…")
                    }
                } else if sections.isEmpty {
                    Section {
                        ContentUnavailableView {
                            Label("No workouts yet", systemImage: "figure.strengthtraining.traditional")
                        } description: {
                            Text("Build a workout, log its sets, and track your weekly progress.")
                        } actions: {
                            Button("Create Workout", systemImage: "plus", action: showWorkoutBuilder)
                                .buttonStyle(.borderedProminent)
                        }
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                    }
                } else {
                    ForEach(sections) { section in
                        Section(section.kind.title) {
                            ForEach(section.sessions) { session in
                                NavigationLink(value: WorkoutDestination.session(session)) {
                                    WorkoutSessionRow(session: session)
                                }
                                .swipeActions {
                                    Button("Delete", systemImage: "trash", role: .destructive) {
                                        delete(session)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .monsGroupedContent()
            .foregroundStyle(MonsColor.textPrimary)
            .navigationTitle("Workouts")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button("New workout", systemImage: "plus", action: showWorkoutBuilder)
                }
            }
            .navigationDestination(for: WorkoutDestination.self) { destination in
                switch destination {
                case .session(let session):
                    WorkoutSessionDetailView(initialSession: session)
                case .template(let template):
                    WorkoutTemplateDetailView(initialTemplate: template)
                }
            }
            #if os(iOS)
            .fullScreenCover(isPresented: $isShowingBuilder) {
                WorkoutBuilderView()
            }
            #else
            .sheet(isPresented: $isShowingBuilder) {
                WorkoutBuilderView()
            }
            #endif
            .task {
                async let workouts: Void = store.loadWorkouts(referenceDate: referenceDate)
                async let templates: Void = store.loadWorkoutTemplates()
                _ = await (workouts, templates)
            }
        }
    }

    private func showWorkoutBuilder() {
        isShowingBuilder = true
    }

    private func delete(_ templateId: UUID) {
        guard deletingTemplateIDs.insert(templateId).inserted else { return }
        Task {
            let deleted = await store.deleteWorkoutTemplate(templateId)
            if deleted {
                coordinator.discardPreparedTemplate(templateId)
            }
            deletingTemplateIDs.remove(templateId)
        }
    }

    private func delete(_ session: WorkoutSession) {
        guard let sessionId = UUID(uuidString: session.id) else { return }
        Task {
            _ = await store.deleteWorkout(sessionId)
        }
    }
}

#Preview("Workouts") {
    WorkoutListView(
        sessions: WorkoutSampleData.sessions(referenceDate: .now, calendar: .current)
    )
    .environment(AppStore.preview)
    .environment(WorkoutCoordinator())
}
