import SwiftUI

struct FoodLogEditorView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    let food: CatalogFood
    let isEditing: Bool
    let pendingItemCount: Int
    let onAdd: (PendingFoodLogItem) -> Void
    let onLog: (PendingFoodLogItem) async -> Bool
    let onSelectIngredient: ((CatalogFood, Double) -> Void)?

    @State private var amount = 100.0
    @State private var entryId = UUID()
    @State private var isSaving = false
    @State private var loggedAt: Date
    @State private var mealCategory: MealCategory
    @State private var selectedPortion: FoodPortion?

    private var targets: NutritionTargets {
        NutritionTargets(calorieGoal: store.calorieGoal)
    }

    private var quantityGrams: Double {
        food.quantityGrams(amount: amount, portion: selectedPortion)
    }

    private var selectablePortions: [FoodPortion] {
        food.portions.isEmpty ? [.standardHundredGrams] : food.portions
    }

    private var recipe: Recipe? {
        guard food.datasetKind == .recipe, let identifier = UUID(uuidString: food.foodId) else { return nil }
        return store.meals.recipes.first { $0.recipeId == identifier }
    }

    init(
        food: CatalogFood,
        loggedAt: Date,
        pendingItemCount: Int,
        onAdd: @escaping (PendingFoodLogItem) -> Void,
        onLog: @escaping (PendingFoodLogItem) async -> Bool
    ) {
        self.food = food
        isEditing = false
        self.pendingItemCount = pendingItemCount
        self.onAdd = onAdd
        self.onLog = onLog
        onSelectIngredient = nil
        let initialPortion = food.portions.first ?? .standardHundredGrams
        _amount = State(initialValue: 1)
        _loggedAt = State(initialValue: loggedAt)
        _mealCategory = State(initialValue: MealCategory.inferred(from: loggedAt))
        _selectedPortion = State(initialValue: initialPortion)
    }

    init(
        entry: FoodLogEntry,
        onSave: @escaping (PendingFoodLogItem) async -> Bool
    ) {
        food = RecentFoodBuilder.catalogFood(from: entry)
        isEditing = true
        pendingItemCount = 0
        onAdd = { _ in }
        onLog = onSave
        onSelectIngredient = nil
        let initialPortion = FoodPortion.standardHundredGrams
        _amount = State(initialValue: entry.quantityGrams / initialPortion.amount)
        _entryId = State(initialValue: entry.entryId)
        _loggedAt = State(initialValue: entry.loggedAt)
        _mealCategory = State(initialValue: entry.mealCategory)
        _selectedPortion = State(initialValue: initialPortion)
    }

    init(
        item: PendingFoodLogItem,
        onSave: @escaping (PendingFoodLogItem) async -> Bool
    ) {
        food = item.food
        isEditing = true
        pendingItemCount = 0
        onAdd = { _ in }
        onLog = onSave
        onSelectIngredient = nil
        let initialPortion = FoodPortion.standardHundredGrams
        _amount = State(initialValue: item.quantityGrams / initialPortion.amount)
        _entryId = State(initialValue: item.entryId)
        _loggedAt = State(initialValue: item.loggedAt)
        _mealCategory = State(initialValue: item.mealCategory)
        _selectedPortion = State(initialValue: initialPortion)
    }

    init(
        food: CatalogFood,
        onSelectIngredient: @escaping (CatalogFood, Double) -> Void
    ) {
        self.food = food
        isEditing = false
        pendingItemCount = 0
        onAdd = { _ in }
        onLog = { _ in false }
        self.onSelectIngredient = onSelectIngredient
        let initialPortion = food.portions.first ?? .standardHundredGrams
        _amount = State(initialValue: 1)
        _loggedAt = State(initialValue: Date())
        _mealCategory = State(initialValue: .snack)
        _selectedPortion = State(initialValue: initialPortion)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: MonsSpacing.xLarge) {
                FoodNutritionHeroCard(food: food, quantityGrams: quantityGrams)

                FoodSourceSummary(food: food)

                if onSelectIngredient != nil {
                    FoodIngredientAmountControls(
                        amount: $amount,
                        selectedPortion: $selectedPortion,
                        portions: selectablePortions,
                        quantityGrams: quantityGrams
                    )
                } else {
                    FoodLogMetadataControls(
                        amount: $amount,
                        selectedPortion: $selectedPortion,
                        loggedAt: $loggedAt,
                        mealCategory: $mealCategory,
                        portions: selectablePortions,
                        quantityGrams: quantityGrams
                    )
                }

                if let recipe {
                    RecipeIngredientBreakdownView(
                        quantityGrams: quantityGrams,
                        recipe: recipe
                    )
                }

                VStack(alignment: .leading, spacing: MonsSpacing.medium) {
                    Text("Impact on targets")
                        .font(MonsTypography.sectionTitle)

                    MonsCard {
                        FoodTargetImpactRow(
                            food: food,
                            quantityGrams: quantityGrams,
                            targets: targets
                        )
                    }
                }

                VStack(alignment: .leading, spacing: MonsSpacing.medium) {
                    Text("Full nutrition")
                        .font(MonsTypography.sectionTitle)

                    Text("For the selected amount · Daily Values where available")
                        .font(MonsTypography.caption)
                        .foregroundStyle(MonsColor.textSecondary)

                    FoodNutritionDetails(
                        food: food,
                        quantityGrams: quantityGrams,
                        targets: NutrientReferenceTargets(nutritionTargets: targets)
                    )
                }
            }
            .padding(.horizontal, MonsSpacing.large)
            .padding(.vertical, MonsSpacing.medium)
        }
        .background(MonsColor.background)
        .tint(MonsColor.action)
        .foregroundStyle(MonsColor.textPrimary)
        .navigationTitle(food.name)
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if onSelectIngredient != nil {
                MonsBottomActionBar {
                    Button("Add Ingredient", systemImage: "plus", action: selectIngredient)
                        .foregroundStyle(MonsColor.actionForeground)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .buttonStyle(.glassProminent)
                        .buttonBorderShape(.capsule)
                        .tint(MonsColor.action)
                        .disabled(quantityGrams <= 0)
                }
            } else {
                FoodLogControls(
                    amount: amount,
                    isEditing: isEditing,
                    isSaving: isSaving,
                    pendingItemCount: pendingItemCount,
                    onAdd: add,
                    onLog: log
                )
            }
        }
        .appToast(store.toast, onDismiss: store.dismissToast)
    }

    private var pendingItem: PendingFoodLogItem? {
        guard amount > 0, quantityGrams > 0 else { return nil }
        return PendingFoodLogItem(
            entryId: entryId,
            food: food,
            loggedAt: loggedAt,
            mealCategory: mealCategory,
            quantityGrams: quantityGrams
        )
    }

    private func add() {
        guard let pendingItem else { return }
        onAdd(pendingItem)
        dismiss()
    }

    private func log() {
        guard let pendingItem else { return }
        isSaving = true
        Task {
            let saved = await onLog(pendingItem)
            isSaving = false
            if saved, isEditing {
                dismiss()
            }
        }
    }

    private func selectIngredient() {
        guard quantityGrams > 0, let onSelectIngredient else { return }
        onSelectIngredient(food, quantityGrams)
        dismiss()
    }
}
