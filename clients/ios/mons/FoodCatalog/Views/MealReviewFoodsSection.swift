import SwiftUI

struct MealReviewFoodsSection: View {
    @Binding var items: [PendingFoodLogItem]
    @Binding var unresolvedItems: [String]

    let onAdd: () -> Void
    let onEdit: (PendingFoodLogItem) -> Void
    let onReplace: (PendingFoodLogItem) -> Void
    let onResolve: (String) -> Void

    var body: some View {
        Section {
            ForEach(items) { item in
                Button {
                    onEdit(item)
                } label: {
                    HStack(spacing: MonsSpacing.medium) {
                        VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                            Text(item.food.name)
                                .foregroundStyle(MonsColor.textPrimary)
                            Text(summary(for: item))
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        Spacer(minLength: MonsSpacing.small)
                        Image(systemName: "chevron.forward")
                            .font(.caption.bold())
                            .foregroundStyle(.tertiary)
                            .accessibilityHidden(true)
                    }
                    .contentShape(.rect)
                }
                .buttonStyle(.plain)
                .swipeActions(edge: .leading, allowsFullSwipe: false) {
                    Button("Replace", systemImage: "arrow.triangle.2.circlepath") {
                        onReplace(item)
                    }
                    .tint(MonsColor.action)
                }
                .swipeActions(edge: .trailing) {
                    Button("Remove", systemImage: "trash", role: .destructive) {
                        remove(item)
                    }
                }
                .contextMenu {
                    Button("Replace", systemImage: "arrow.triangle.2.circlepath") {
                        onReplace(item)
                    }
                    Button("Remove", systemImage: "trash", role: .destructive) {
                        remove(item)
                    }
                }
            }
            .onDelete(perform: removeItems)
        } header: {
            HStack {
                Text("Foods")
                Spacer()
                Button("Add Food", systemImage: "plus", action: onAdd)
                    .textCase(nil)
            }
        }

        if !unresolvedItems.isEmpty {
            Section {
                ForEach(unresolvedItems, id: \.self) { name in
                    Button {
                        onResolve(name)
                    } label: {
                        Label(name, systemImage: "magnifyingglass")
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .contentShape(.rect)
                    }
                    .buttonStyle(.plain)
                    .swipeActions {
                        Button("Remove", systemImage: "trash", role: .destructive) {
                            removeUnresolved(name)
                        }
                    }
                }
                .onDelete(perform: removeUnresolvedItems)
            } header: {
                Label("Needs review", systemImage: "exclamationmark.triangle")
            } footer: {
                Text("Tap to find a catalog match, or swipe to remove it.")
            }
        }
    }

    private func summary(for item: PendingFoodLogItem) -> String {
        let grams = item.quantityGrams.formatted(.number.precision(.fractionLength(0...1)))
        let energy = calories(for: item).formatted(.number.precision(.fractionLength(0)))
        return "\(grams) g · \(energy) kcal"
    }

    private func remove(_ item: PendingFoodLogItem) {
        items.removeAll { $0.id == item.id }
    }

    private func removeItems(at offsets: IndexSet) {
        items.remove(atOffsets: offsets)
    }

    private func removeUnresolved(_ name: String) {
        unresolvedItems.removeAll { $0 == name }
    }

    private func removeUnresolvedItems(at offsets: IndexSet) {
        unresolvedItems.remove(atOffsets: offsets)
    }

    private func calories(for item: PendingFoodLogItem) -> Double {
        (item.food.calories ?? 0) * item.quantityGrams / 100
    }
}
