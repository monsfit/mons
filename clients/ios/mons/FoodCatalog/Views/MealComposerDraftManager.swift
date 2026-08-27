#if DEBUG && os(iOS)
import SwiftUI

struct MealComposerDraftManager: View {
    let draft: MealComposerDraft
    let onEdit: (MealComposerDraftItem) -> Void
    let onRemove: (MealComposerDraftItem) -> Void
    let onReview: () -> Void

    var body: some View {
        ScrollView {
            LazyVStack(spacing: MonsSpacing.medium) {
                if !draft.context.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    HStack(alignment: .top, spacing: MonsSpacing.medium) {
                        Image(systemName: "text.quote")
                            .frame(width: 44, height: 44)
                            .background(.thinMaterial, in: Circle())

                        VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                            Text("Meal context")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.secondary)

                            Text(draft.context)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                    .padding(MonsSpacing.medium)
                    .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                }

                ForEach(draft.items) { item in
                    HStack(spacing: MonsSpacing.medium) {
                        MealComposerItemThumbnail(item: item, size: 52)

                        VStack(alignment: .leading, spacing: 3) {
                            Text(item.title)
                                .font(.body.weight(.semibold))

                            Text(item.kind == .food ? servingDescription(item) : item.detail)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer(minLength: MonsSpacing.small)

                        if item.kind == .food {
                            Button("Edit") {
                                onEdit(item)
                            }
                            .buttonStyle(.borderless)
                        }

                        Button(role: .destructive) {
                            onRemove(item)
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.title3)
                        }
                        .buttonStyle(.borderless)
                        .accessibilityLabel("Remove \(item.title)")
                    }
                    .padding(MonsSpacing.medium)
                    .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                }

                if draft.items.isEmpty {
                    ContentUnavailableView(
                        "No foods or photos",
                        systemImage: "square.stack.3d.up.slash",
                        description: Text("Use the plus button or search to build this meal.")
                    )
                    .padding(.top, MonsSpacing.xLarge)
                }

                if draft.hasContent {
                    Button("Review Meal", systemImage: "arrow.up") {
                        onReview()
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .frame(maxWidth: .infinity)
                    .padding(.top, MonsSpacing.small)
                }
            }
            .padding(.horizontal, MonsSpacing.large)
            .padding(.bottom, 112)
        }
    }

    private func servingDescription(_ item: MealComposerDraftItem) -> String {
        let amount = item.servings.formatted(.number.precision(.fractionLength(0...1)))
        return "\(amount) \(item.unit) · \(item.calories) cal · exact"
    }
}
#endif
