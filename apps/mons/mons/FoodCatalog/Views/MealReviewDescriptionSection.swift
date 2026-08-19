import SwiftUI

struct MealReviewDescriptionSection: View {
    @Binding var description: String

    let canRewrite: Bool
    let isRewriting: Bool
    let onRewrite: () -> Void

    var body: some View {
        Section {
            TextField("Describe this meal", text: $description, axis: .vertical)
                .lineLimit(2...4)
        } header: {
            HStack {
                Text("Meal description")
                Spacer()
                Button("Rewrite", systemImage: "sparkles", action: onRewrite)
                    .textCase(nil)
                    .disabled(!canRewrite || isRewriting)
            }
        } footer: {
            if isRewriting {
                ProgressView("Writing with Luna…")
            }
        }
    }
}
