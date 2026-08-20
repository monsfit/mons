#if DEBUG && os(iOS)
import SwiftUI

struct MealComposerReview: View {
    enum Phase: Equatable {
        case ready
        case calculating
        case result
    }

    let draft: MealComposerDraft
    let phase: Phase
    let onStartCalculation: () -> Void
    let onCompleteCalculation: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: MonsSpacing.xLarge) {
                if !draft.knownFoods.isEmpty {
                    reviewSection(
                        title: "Exact foods",
                        subtitle: "Nutrition comes directly from the food database.",
                        items: draft.knownFoods
                    )
                }

                if draft.requiresAI {
                    aiInputs
                    aiStatus
                } else {
                    knownOnlyStatus
                }
            }
            .padding(.horizontal, MonsSpacing.large)
            .padding(.bottom, 112)
        }
    }

    private func reviewSection(
        title: String,
        subtitle: String,
        items: [MealComposerDraftItem]
    ) -> some View {
        VStack(alignment: .leading, spacing: MonsSpacing.medium) {
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.headline)

                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            ForEach(items) { item in
                HStack(spacing: MonsSpacing.medium) {
                    MealComposerItemThumbnail(item: item, size: 46)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.title)
                            .font(.subheadline.weight(.semibold))

                        Text("\(item.servings.formatted(.number.precision(.fractionLength(0...1)))) \(item.unit)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Text("\(item.calories) cal")
                        .font(.subheadline.weight(.semibold))
                }
                .padding(MonsSpacing.medium)
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
        }
    }

    private var aiInputs: some View {
        VStack(alignment: .leading, spacing: MonsSpacing.medium) {
            VStack(alignment: .leading, spacing: 3) {
                Label("AI inputs", systemImage: "sparkles")
                    .font(.headline)

                Text("Only these ambiguous inputs need an estimate.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if !draft.context.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                HStack(alignment: .top, spacing: MonsSpacing.medium) {
                    Image(systemName: "text.quote")
                        .frame(width: 42, height: 42)
                        .background(.thinMaterial, in: Circle())

                    Text(draft.context)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(MonsSpacing.medium)
                .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            }

            if !draft.images.isEmpty {
                HStack(spacing: -10) {
                    ForEach(draft.images.prefix(3)) { item in
                        MealComposerItemThumbnail(item: item, size: 58)
                            .padding(3)
                            .background(.white, in: RoundedRectangle(cornerRadius: 17, style: .continuous))
                    }

                    Text(draft.images.count == 1 ? "1 photo" : "\(draft.images.count) photos")
                        .font(.subheadline.weight(.medium))
                        .padding(.leading, MonsSpacing.xLarge)
                }
            }
        }
    }

    @ViewBuilder
    private var aiStatus: some View {
        switch phase {
        case .ready:
            Button("Calculate AI Items", systemImage: "sparkles", action: onStartCalculation)
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .frame(maxWidth: .infinity)
        case .calculating:
            VStack(spacing: MonsSpacing.large) {
                ProgressView()
                    .controlSize(.large)

                Text("Estimating only the text and photos…")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Button("Show Mock Result", action: onCompleteCalculation)
                    .buttonStyle(.bordered)
            }
            .frame(maxWidth: .infinity)
            .padding(MonsSpacing.xLarge)
            .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        case .result:
            VStack(alignment: .leading, spacing: MonsSpacing.medium) {
                Label("Ready to add", systemImage: "checkmark.circle.fill")
                    .font(.headline)
                    .foregroundStyle(.green)

                HStack {
                    Text("Exact foods")
                    Spacer()
                    Text("\(draft.exactCalories) cal")
                }

                HStack {
                    Text("AI estimate")
                    Spacer()
                    Text("430 cal")
                }

                Divider()

                HStack {
                    Text("Meal total")
                        .font(.headline)
                    Spacer()
                    Text("\(draft.exactCalories + 430) cal")
                        .font(.headline)
                }

                Button("Add Meal") {}
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .frame(maxWidth: .infinity)
            }
            .padding(MonsSpacing.large)
            .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        }
    }

    private var knownOnlyStatus: some View {
        VStack(alignment: .leading, spacing: MonsSpacing.medium) {
            Label("No AI calculation needed", systemImage: "checkmark.seal.fill")
                .font(.headline)
                .foregroundStyle(.green)

            Text("All \(draft.knownFoods.count) items have exact database nutrition.")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            HStack {
                Text("Meal total")
                    .font(.headline)
                Spacer()
                Text("\(draft.exactCalories) cal")
                    .font(.headline)
            }

            Button("Add Meal") {}
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .frame(maxWidth: .infinity)
        }
        .padding(MonsSpacing.large)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}
#endif
