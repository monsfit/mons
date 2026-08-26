import PhotosUI
import SwiftUI

struct RecipeEditorView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var freeformIngredients: [FreeformIngredientDraft]
    @State private var imageData: Data?
    @State private var ingredients: [RecipeIngredientDraft]
    @State private var ingredientEstimateMessage: String?
    @State private var isEstimatingIngredients = false
    @State private var isSaving = false
    @State private var name: String
    @State private var notes: String
    @State private var photo: PhotosPickerItem?
    @State private var servings: Double
    @State private var showsFoodPicker = false
    @State private var totalYieldGrams: Double

    private let recipeId: UUID

    init(recipe: Recipe? = nil) {
        recipeId = recipe?.recipeId ?? UUID()
        _name = State(initialValue: recipe?.name ?? "")
        _notes = State(initialValue: recipe?.notes ?? "")
        _servings = State(initialValue: recipe?.servings ?? 0)
        _totalYieldGrams = State(initialValue: recipe?.totalYieldGrams ?? 0)
        _imageData = State(initialValue: recipe?.imageDataBase64)
        _ingredients = State(initialValue: recipe?.ingredients.map { ingredient in
            RecipeIngredientDraft(
                id: ingredient.ingredientId,
                food: CatalogFood(
                    brand: nil,
                    calories: ingredient.calories,
                    carbohydrates: ingredient.carbohydrates,
                    datasetKind: ingredient.sourceKind,
                    foodId: ingredient.foodId,
                    gtin: nil,
                    name: ingredient.name,
                    nutrients: [],
                    portions: [],
                    protein: ingredient.protein,
                    source: "snapshot",
                    sourceId: ingredient.foodId,
                    totalFat: ingredient.totalFat
                ),
                quantityGrams: ingredient.quantityGrams
            )
        } ?? [])
        _freeformIngredients = State(initialValue: recipe?.freeformIngredients.map {
            FreeformIngredientDraft(id: $0.ingredientId, text: $0.text)
        } ?? [])
    }

    var body: some View {
        let hasImage = imageData != nil

        Form {
            Section("Recipe") {
                TextField("Name", text: $name)
                TextField("Notes", text: $notes, axis: .vertical)
                    .lineLimit(2...6)
                PhotosPicker(selection: $photo, matching: .images) {
                    Label(hasImage ? "Replace photo" : "Add photo", systemImage: "photo")
                }
            }

            Section {
                LabeledContent("Cooked yield") {
                    measurementField(value: $totalYieldGrams, unit: "g")
                }
                LabeledContent("Servings (optional)") {
                    measurementField(value: $servings, unit: "")
                }
                if totalYieldGrams > 0, servings > 0 {
                    LabeledContent("Weight per serving") {
                        Text("\((totalYieldGrams / servings).formatted(.number.precision(.fractionLength(0...1)))) g")
                    }
                }
            } header: {
                Text("Portions")
            } footer: {
                Text("Weigh the finished recipe after cooking. Logging any bowl weight then scales nutrition directly from this measured yield.")
            }

            Section("Foods") {
                ForEach($ingredients) { $ingredient in
                    RecipeIngredientEditorRow(
                        ingredient: $ingredient,
                        onRemove: { removeIngredient(id: ingredient.id) }
                    )
                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                        Button("Delete", systemImage: "trash", role: .destructive) {
                            removeIngredient(id: ingredient.id)
                        }
                    }
                }
                Button("Add from food database", systemImage: "plus") {
                    showsFoodPicker = true
                }
            }

            Section {
                ForEach($freeformIngredients) { $ingredient in
                    RecipeWrittenIngredientEditorRow(
                        ingredient: $ingredient,
                        onRemove: { removeFreeformIngredient(id: ingredient.id) }
                    )
                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                        Button("Delete", systemImage: "trash", role: .destructive) {
                            removeFreeformIngredient(id: ingredient.id)
                        }
                    }
                }
                Button("Add written ingredient", systemImage: "plus") {
                    freeformIngredients.append(FreeformIngredientDraft(id: UUID(), text: ""))
                }
                if hasWrittenIngredients {
                    Button {
                        matchWrittenIngredients()
                    } label: {
                        MonsAsyncActionLabel(
                            title: "Match with food database",
                            loadingTitle: "Matching ingredients",
                            systemImage: "sparkles",
                            isLoading: isEstimatingIngredients
                        )
                    }
                    .disabled(isEstimatingIngredients || isSaving)
                }
                if let ingredientEstimateMessage {
                    Text(ingredientEstimateMessage)
                        .font(.footnote)
                        .foregroundStyle(MonsColor.textSecondary)
                }
            } header: {
                Text("Written ingredients")
            } footer: {
                Text("Mons can parse these lines, match them to real catalog foods, and add editable gram amounts above. Unmatched lines remain visible and never invent nutrition.")
            }
        }
        .monsGroupedContent()
        .navigationTitle("Recipe")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel", action: dismiss.callAsFunction)
                    .disabled(isSaving || isEstimatingIngredients)
            }
            ToolbarItem(placement: .confirmationAction) {
                Button {
                    save()
                } label: {
                    MonsAsyncActionLabel(
                        title: "Save",
                        loadingTitle: "Saving…",
                        systemImage: "checkmark",
                        isLoading: isSaving
                    )
                }
                .disabled(!isValid || isSaving || isEstimatingIngredients)
            }
        }
        .sheet(isPresented: $showsFoodPicker) {
            RecipeIngredientSearchView { food, quantityGrams in
                ingredients.append(
                    RecipeIngredientDraft(id: UUID(), food: food, quantityGrams: quantityGrams)
                )
                showsFoodPicker = false
            }
        }
        .task(id: photo) {
            guard let data = try? await photo?.loadTransferable(type: Data.self) else { return }
            imageData = FoodImageData.normalizedJPEG(data) ?? imageData
        }
        .interactiveDismissDisabled(isSaving || isEstimatingIngredients)
    }

    private var hasWrittenIngredients: Bool {
        freeformIngredients.contains {
            !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
    }

    private var isValid: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && totalYieldGrams > 0
            && (!ingredients.isEmpty || freeformIngredients.contains { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty })
            && ingredients.allSatisfy { $0.quantityGrams > 0 }
    }

    private func measurementField(value: Binding<Double>, unit: String) -> some View {
        HStack(spacing: MonsSpacing.xSmall) {
            TextField("Amount", value: value, format: .number.precision(.fractionLength(0...2)))
                .multilineTextAlignment(.trailing)
                #if os(iOS)
                .keyboardType(.decimalPad)
                #endif
            if !unit.isEmpty {
                Text(unit).foregroundStyle(MonsColor.textSecondary)
            }
        }
        .frame(maxWidth: 140)
    }

    private func save() {
        isSaving = true
        let request = SaveRecipeRequest(
            freeformIngredients: freeformIngredients.compactMap(\.parsedIngredient),
            imageDataBase64: imageData,
            ingredients: ingredients.map { item in
                RecipeIngredient(
                    calories: item.food.calories,
                    carbohydrates: item.food.carbohydrates,
                    foodId: item.food.foodId,
                    ingredientId: item.id,
                    name: item.food.name,
                    protein: item.food.protein,
                    quantityGrams: item.quantityGrams,
                    sourceKind: item.food.datasetKind,
                    totalFat: item.food.totalFat
                )
            },
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            notes: notes.trimmingCharacters(in: .whitespacesAndNewlines),
            recipeId: recipeId,
            servings: servings > 0 ? servings : nil,
            totalYieldGrams: totalYieldGrams
        )
        Task {
            let saved = await store.meals.saveRecipe(request)
            isSaving = false
            if saved != nil { dismiss() }
        }
    }

    private func matchWrittenIngredients() {
        let lines = freeformIngredients
            .map { $0.text.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        guard !lines.isEmpty, !isEstimatingIngredients else { return }

        isEstimatingIngredients = true
        ingredientEstimateMessage = nil
        Task {
            let estimate = await store.meals.estimate(.text(lines.joined(separator: "\n")))
            if let estimate {
                let matched = estimate.items.compactMap { item -> RecipeIngredientDraft? in
                    guard let food = item.catalogFood else { return nil }
                    return RecipeIngredientDraft(
                        id: UUID(),
                        food: food,
                        quantityGrams: item.amountGrams
                    )
                }
                ingredients.append(contentsOf: matched)
                freeformIngredients = estimate.unresolvedItems.map {
                    FreeformIngredientDraft(id: UUID(), text: $0)
                }
                ingredientEstimateMessage = estimate.unresolvedItems.isEmpty
                    ? "Matched \(matched.count) ingredients. Review their gram amounts before saving."
                    : "Matched \(matched.count); \(estimate.unresolvedItems.count) still need review."
            }
            isEstimatingIngredients = false
        }
    }

    private func removeIngredient(id: UUID) {
        ingredients.removeAll { $0.id == id }
    }

    private func removeFreeformIngredient(id: UUID) {
        freeformIngredients.removeAll { $0.id == id }
    }
}

#Preview("Recipe editor") {
    NavigationStack {
        RecipeEditorView()
    }
    .environment(AppStore.preview)
}
