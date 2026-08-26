import SwiftUI

struct MealTextEstimateView: View {
    @Environment(\.dismiss) private var dismiss

    let onSubmit: (String) async -> Bool

    @State private var description = ""
    @State private var isSubmitting = false

    private var normalizedDescription: String {
        description.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField(
                        "Two fried eggs, toast, and a small orange",
                        text: $description,
                        axis: .vertical
                    )
                    .lineLimit(4...10)
                } header: {
                    Text("Describe your meal")
                } footer: {
                    Text("Mons will match your description to foods in the catalog before calculating nutrition.")
                }
            }
            .monsGroupedContent()
            .navigationTitle("Describe Meal")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: dismiss.callAsFunction)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        submit()
                    } label: {
                        MonsAsyncActionLabel(
                            title: "Analyze",
                            loadingTitle: "Analyzing",
                            systemImage: "sparkles",
                            isLoading: isSubmitting
                        )
                    }
                    .disabled(normalizedDescription.count < 2 || isSubmitting)
                }
            }
        }
        .monsSheetPresentation()
    }

    private func submit() {
        let value = normalizedDescription
        guard value.count >= 2, !isSubmitting else { return }
        isSubmitting = true
        Task {
            let succeeded = await onSubmit(value)
            isSubmitting = false
            if succeeded { dismiss() }
        }
    }
}
