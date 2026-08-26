import SwiftUI

struct RecipeLibraryView: View {
    @Environment(AppStore.self) private var store

    @State private var pendingDeletion: Recipe?
    @State private var showsNewRecipe = false

    var body: some View {
        NavigationStack {
            List {
                if store.meals.recipes.isEmpty {
                    ContentUnavailableView(
                        "No Recipes Yet",
                        systemImage: "book.closed",
                        description: Text("Create a recipe to save its ingredients, yield, and nutrition.")
                    )
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
                } else {
                    Section {
                        ForEach(store.meals.recipes) { recipe in
                            NavigationLink(value: recipe) {
                                FoodSearchResultRow(food: recipe.catalogFood, searchText: "")
                            }
                            .accessibilityHint("Opens recipe editor")
                            .swipeActions(edge: .trailing) {
                                Button("Delete", systemImage: "trash", role: .destructive) {
                                    pendingDeletion = recipe
                                }
                            }
                        }
                    } footer: {
                        Text("Tap a recipe to edit its ingredients, portions, or nutrition.")
                    }
                }
            }
            .monsGroupedContent()
            .navigationTitle("Recipes")
            .navigationDestination(for: Recipe.self) { recipe in
                RecipeEditorView(recipe: recipe)
            }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button("Create recipe", systemImage: "plus", action: createRecipe)
                }
            }
            .sheet(isPresented: $showsNewRecipe) {
                NavigationStack {
                    RecipeEditorView()
                }
                .monsSheetPresentation()
            }
            .confirmationDialog(
                "Delete \(pendingDeletion?.name ?? "recipe")?",
                isPresented: Binding(
                    get: { pendingDeletion != nil },
                    set: { if !$0 { pendingDeletion = nil } }
                ),
                titleVisibility: .visible
            ) {
                Button("Delete", role: .destructive, action: deleteRecipe)
                Button("Cancel", role: .cancel) { pendingDeletion = nil }
            } message: {
                Text("Existing meal log entries keep their saved nutrition snapshot.")
            }
        }
    }

    private func createRecipe() {
        showsNewRecipe = true
    }

    private func deleteRecipe() {
        guard let recipe = pendingDeletion else { return }
        pendingDeletion = nil
        Task {
            _ = await store.meals.deleteRecipe(recipe.id)
        }
    }
}

#Preview("Recipe library") {
    RecipeLibraryView()
        .environment(AppStore.preview)
}
