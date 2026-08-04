import SwiftUI

struct WorkoutEditorView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var completedAt = Date.now
    @State private var distanceKilometers = 0.0
    @State private var durationMinutes = 30
    @State private var isSaving = false
    @State private var kind = WorkoutKind.strength
    @State private var sets: [WorkoutDraftSet] = []
    @State private var title = ""

    private let sessionId = UUID()

    var body: some View {
        NavigationStack {
            Form {
                Section("Workout") {
                    TextField("Title", text: $title)
                    Picker("Type", selection: $kind) {
                        ForEach(WorkoutKind.allCases) { kind in
                            Label(kind.title, systemImage: kind.systemImage)
                                .tag(kind)
                        }
                    }
                    DatePicker("Completed", selection: $completedAt)
                    TextField("Duration (minutes)", value: $durationMinutes, format: .number)
                    if kind == .cardio {
                        TextField(
                            "Distance (km)",
                            value: $distanceKilometers,
                            format: .number
                        )
                    }
                }

                Section("Exercises and intervals") {
                    ForEach($sets) { $set in
                        VStack(alignment: .leading) {
                            TextField("Exercise", text: $set.title)
                            TextField("Details", text: $set.detail)
                            TextField("Value", text: $set.value)
                        }
                    }
                    .onDelete(perform: deleteSets)

                    Button("Add item", systemImage: "plus", action: addSet)
                }
            }
            .scrollContentBackground(.hidden)
            .background(.clear)
            .foregroundStyle(MonsColor.textPrimary)
            .navigationTitle("Log workout")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: dismiss.callAsFunction)
                        .tint(MonsColor.error)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save", action: save)
                        .disabled(trimmedTitle.isEmpty || durationMinutes < 0 || isSaving)
                }
            }
        }
        .tint(MonsColor.action)
        .monsSheetPresentation()
    }

    private var trimmedTitle: String {
        title.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func addSet() {
        sets.append(WorkoutDraftSet())
    }

    private func deleteSets(at offsets: IndexSet) {
        sets.remove(atOffsets: offsets)
    }

    private func save() {
        isSaving = true
        let startedAt = completedAt.addingTimeInterval(TimeInterval(-durationMinutes * 60))
        let request = SaveWorkoutRequest(
            completedAt: completedAt,
            distanceKilometers: kind == .cardio ? max(distanceKilometers, 0) : nil,
            durationMinutes: max(durationMinutes, 0),
            kind: kind,
            sessionId: sessionId,
            sets: sets.compactMap { set in
                let title = set.title.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !title.isEmpty else { return nil }
                return SaveWorkoutSetRequest(
                    detail: set.detail.trimmingCharacters(in: .whitespacesAndNewlines),
                    setId: set.id,
                    title: title,
                    value: set.value.trimmingCharacters(in: .whitespacesAndNewlines)
                )
            },
            startedAt: startedAt,
            title: trimmedTitle
        )
        Task {
            let saved = await store.saveWorkout(request)
            isSaving = false
            if saved {
                dismiss()
            }
        }
    }
}
