import SwiftUI

struct FoodSearchSection: View {
    let title: String
    let subtitle: String
    let foods: [CatalogFood]
    let searchText: String
    let onSelect: (CatalogFood) -> Void
    let onEdit: ((CatalogFood) -> Void)?
    let onDelete: ((CatalogFood) -> Void)?

    init(
        title: String,
        subtitle: String,
        foods: [CatalogFood],
        searchText: String,
        onSelect: @escaping (CatalogFood) -> Void,
        onEdit: ((CatalogFood) -> Void)? = nil,
        onDelete: ((CatalogFood) -> Void)? = nil
    ) {
        self.title = title
        self.subtitle = subtitle
        self.foods = foods
        self.searchText = searchText
        self.onSelect = onSelect
        self.onEdit = onEdit
        self.onDelete = onDelete
    }

    var body: some View {
        Section {
            ForEach(foods) { food in
                Button {
                    onSelect(food)
                } label: {
                    FoodSearchResultRow(food: food, searchText: searchText)
                        .contentShape(.rect)
                }
                .buttonStyle(.plain)
                .swipeActions(edge: .leading, allowsFullSwipe: false) {
                    if let onEdit {
                        Button("Edit", systemImage: "pencil") {
                            onEdit(food)
                        }
                        .tint(MonsColor.action)
                    }
                }
                .swipeActions(edge: .trailing) {
                    if let onDelete {
                        Button("Delete", systemImage: "trash", role: .destructive) {
                            onDelete(food)
                        }
                    }
                }
                .contextMenu {
                    if let onEdit {
                        Button("Edit", systemImage: "pencil") { onEdit(food) }
                    }
                    if let onDelete {
                        Button("Delete", systemImage: "trash", role: .destructive) {
                            onDelete(food)
                        }
                    }
                }
            }
        } header: {
            HStack(alignment: .firstTextBaseline, spacing: MonsSpacing.medium) {
                Text(title)

                Spacer(minLength: MonsSpacing.small)

                Text(foods.count.formatted())
                    .accessibilityLabel("\(foods.count) foods")
            }
        } footer: {
            Text(subtitle)
        }
    }
}
