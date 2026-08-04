import SwiftUI

struct WorkoutListView: View {
    @Environment(AppStore.self) private var store

    @State private var isShowingEditor = false

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
        NavigationStack {
            List {
                Section("This week") {
                    WorkoutWeeklySummaryRow(summary: weeklySummary)
                }

                if sections.isEmpty {
                    ContentUnavailableView(
                        "No workouts yet",
                        systemImage: "figure.run",
                        description: Text("Completed strength and cardio sessions will appear here.")
                    )
                } else {
                    ForEach(sections) { section in
                        Section(section.kind.title) {
                            ForEach(section.sessions) { session in
                                NavigationLink(value: DetailDestination(workout: session)) {
                                    WorkoutSessionRow(session: session)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Workouts")
            .toolbar {
                ToolbarItemGroup(placement: .primaryAction) {
                    if let activeWorkout = sessions.first {
                        NavigationLink {
                            ActiveWorkoutView(workout: activeWorkout)
                        } label: {
                            Label("Active workout", systemImage: "play.fill")
                        }
                    }

                    Button("Log workout", systemImage: "plus") {
                        isShowingEditor = true
                    }
                }
            }
            .navigationDestination(for: DetailDestination.self, destination: PlaceholderDetailView.init)
            .sheet(isPresented: $isShowingEditor) {
                WorkoutEditorView()
            }
            .task {
                await store.loadWorkouts(referenceDate: referenceDate)
            }
        }
    }
}

#Preview("Workouts") {
    WorkoutListView(
        sessions: WorkoutSampleData.sessions(referenceDate: .now, calendar: .current)
    )
    .environment(AppStore.preview)
}
