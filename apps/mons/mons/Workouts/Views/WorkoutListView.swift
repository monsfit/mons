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
            ScrollView {
                LazyVStack(alignment: .leading, spacing: MonsSpacing.large) {
                    Text("This week")
                        .font(MonsTypography.sectionTitle)

                    WorkoutWeeklySummaryRow(summary: weeklySummary)

                    if sections.isEmpty {
                        ContentUnavailableView {
                            Label("No workouts yet", systemImage: "figure.strengthtraining.traditional")
                        } description: {
                            Text("Build a workout, log its sets, and track your weekly progress.")
                        } actions: {
                            Button("Create Workout", systemImage: "plus", action: showWorkoutBuilder)
                                .buttonStyle(
                                    MonsPrimaryButtonStyle(
                                        tint: MonsColor.workoutAccent,
                                        foreground: MonsColor.accentForeground
                                    )
                                )
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, MonsSpacing.xLarge)
                    } else {
                        ForEach(sections) { section in
                            VStack(alignment: .leading, spacing: MonsSpacing.medium) {
                                Text(section.kind.title)
                                    .font(MonsTypography.sectionTitle)

                                ForEach(section.sessions) { session in
                                    NavigationLink(value: DetailDestination(workout: session)) {
                                        MonsCard {
                                            WorkoutSessionRow(session: session)
                                        }
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                }
                .padding(MonsSpacing.large)
            }
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
