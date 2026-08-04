import SwiftUI

struct WorkoutListView: View {
    private let referenceDate: Date
    private let calendar: Calendar
    private let sessions: [WorkoutSession]

    init(
        referenceDate: Date = .now,
        calendar: Calendar = .current,
        sessions: [WorkoutSession]? = nil
    ) {
        self.referenceDate = referenceDate
        self.calendar = calendar
        self.sessions = sessions ?? WorkoutSampleData.sessions(referenceDate: referenceDate, calendar: calendar)
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
                if let activeWorkout = sessions.first {
                    ToolbarItem(placement: .primaryAction) {
                        NavigationLink {
                            ActiveWorkoutView(workout: activeWorkout)
                        } label: {
                            Label("Active workout", systemImage: "play.fill")
                        }
                    }
                }
            }
            .navigationDestination(for: DetailDestination.self, destination: PlaceholderDetailView.init)
        }
    }
}

#Preview("Workouts") {
    WorkoutListView()
}
