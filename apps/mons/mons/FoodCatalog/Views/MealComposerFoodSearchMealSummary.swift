#if DEBUG && os(iOS)
import SwiftUI

struct MealComposerFoodSearchMealSummary: View {
    @Binding var draft: MealComposerDraft
    let onLogMeal: () -> Void

    var body: some View {
        List {
            if draft.items.isEmpty {
                ContentUnavailableView(
                    "No meal items yet",
                    systemImage: "fork.knife",
                    description: Text("Add foods, recipes, photos, or context to build this meal.")
                )
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
            } else {
                Section("Selected Items") {
                    ForEach(draft.items) { item in
                        HStack(spacing: MonsSpacing.medium) {
                            MealComposerItemThumbnail(item: item, size: 44)

                            VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                                Text(item.title)
                                    .font(.headline)

                                Text(item.detail)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer(minLength: MonsSpacing.small)

                            if item.calories > 0 {
                                Text("\(item.calories) cal")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }

                            Button("Remove \(item.title)", systemImage: "xmark", action: {
                                remove(item)
                            })
                            .labelStyle(.iconOnly)
                            .buttonStyle(.glass)
                            .buttonBorderShape(.circle)
                            .frame(width: 44, height: 44)
                        }
                    }
                }

                Section("Meal Total") {
                    LabeledContent("Items", value: draft.items.count.formatted())
                    LabeledContent("Calories", value: "\(draft.exactCalories) cal")
                }
            }
        }
        .listStyle(.insetGrouped)
        .safeAreaInset(edge: .bottom) {
            if !draft.knownFoods.isEmpty {
                MealComposerFoodSearchMealTotal(
                    itemCount: draft.knownFoods.count,
                    calories: draft.exactCalories,
                    onLogMeal: onLogMeal
                )
            }
        }
    }

    private func remove(_ item: MealComposerDraftItem) {
        draft.items.removeAll { $0.id == item.id }
    }
}
#endif
