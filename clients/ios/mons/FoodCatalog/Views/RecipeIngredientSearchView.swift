import SwiftUI

struct RecipeIngredientSearchView: View {
    @State private var searchText = ""

    let onSelect: (CatalogFood, Double) -> Void

    var body: some View {
        FoodSearchBrowser(
            searchText: $searchText,
            onSelectIngredient: onSelect
        )
        .monsSheetPresentation()
    }
}
