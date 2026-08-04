import SwiftUI

struct WorkoutListView: View {
    @Environment(AppStore.self) private var store

    @State private var isShowingBuilder = false

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
                        .listRowBackground(MonsColor.surfaceRaised)
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
                                .listRowBackground(MonsColor.surface)
                                .listRowSeparatorTint(MonsColor.border)
                            }
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(MonsColor.background)
            .foregroundStyle(MonsColor.textPrimary)
            .navigationTitle("Workouts")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button("New workout", systemImage: "plus", action: showWorkoutBuilder)
                }
            }
            .navigationDestination(for: DetailDestination.self, destination: PlaceholderDetailView.init)
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
                await store.loadWorkouts(referenceDate: referenceDate)
            }
        }
        .tint(MonsColor.workoutAccent)
    }

    private func showWorkoutBuilder() {
        isShowingBuilder = true
    }
}

#Preview("Workouts") {
    WorkoutListView(
        sessions: WorkoutSampleData.sessions(referenceDate: .now, calendar: .current)
    )
    .environment(AppStore.preview)
}
