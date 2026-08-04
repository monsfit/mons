import SwiftUI

struct ExercisePickerView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var mode = WorkoutPickerMode.exercises
    @State private var searchText = ""
    @State private var selectedIDs: Set<String>

    let onSelectExercise: (ExerciseDefinition) -> Void
    let onSelectTemplate: (WorkoutTemplate) -> Void

    init(
        selectedIDs: Set<String>,
        onSelectExercise: @escaping (ExerciseDefinition) -> Void,
        onSelectTemplate: @escaping (WorkoutTemplate) -> Void
    ) {
        _selectedIDs = State(initialValue: selectedIDs)
        self.onSelectExercise = onSelectExercise
        self.onSelectTemplate = onSelectTemplate
    }

    var body: some View {
        NavigationStack {
            List {
                Picker("Workout source", selection: $mode) {
                    ForEach(WorkoutPickerMode.allCases) { mode in
                        Text(mode.rawValue).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)

                if mode == .exercises {
                    ForEach(filteredExercises) { exercise in
                        ExercisePickerRow(
                            exercise: exercise,
                            isSelected: selectedIDs.contains(exercise.id),
                            onSelect: { select(exercise) }
                        )
                        .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                    }
                } else {
                    ForEach(filteredTemplates) { template in
                        WorkoutTemplateRow(template: template, onSelect: { select(template) })
                            .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                    }
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(MonsColor.background)
            .navigationTitle("Add Exercises")
            .searchable(text: $searchText, prompt: mode == .exercises ? "Search exercises" : "Search templates")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done", action: dismiss.callAsFunction)
                }
            }
        }
        .tint(MonsColor.workoutAccent)
        .monsSheetPresentation()
    }

    private var filteredExercises: [ExerciseDefinition] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return ExerciseCatalog.exercises }
        return ExerciseCatalog.exercises.filter {
            $0.name.localizedStandardContains(query)
                || $0.category.localizedStandardContains(query)
                || $0.equipment.localizedStandardContains(query)
        }
    }

    private var filteredTemplates: [WorkoutTemplate] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return ExerciseCatalog.templates }
        return ExerciseCatalog.templates.filter { $0.name.localizedStandardContains(query) }
    }

    private func select(_ exercise: ExerciseDefinition) {
        guard selectedIDs.insert(exercise.id).inserted else { return }
        onSelectExercise(exercise)
    }

    private func select(_ template: WorkoutTemplate) {
        selectedIDs.formUnion(template.exerciseIDs)
        onSelectTemplate(template)
        dismiss()
    }
}
