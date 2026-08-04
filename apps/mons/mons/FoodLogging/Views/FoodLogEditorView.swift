import SwiftUI

struct FoodLogEditorView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    let food: CatalogFood
    let onLogged: () -> Void

    @State private var category = MealCategory.snack
    @State private var isSaving = false
    @State private var loggedAt: Date
    @State private var quantityGrams = 100.0

    private var targets: NutritionTargets {
        NutritionTargets(calorieGoal: store.calorieGoal)
    }

    init(food: CatalogFood, loggedAt: Date, onLogged: @escaping () -> Void) {
        self.food = food
        self.onLogged = onLogged
        _loggedAt = State(initialValue: loggedAt)
    }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: MonsSpacing.xLarge) {
                FoodNutritionSummary(food: food, quantityGrams: quantityGrams)

                FoodSourceSummary(food: food)

                FoodLogMetadataControls(
                    category: $category,
                    loggedAt: $loggedAt
                )

                Divider()

                VStack(alignment: .leading, spacing: 16) {
                    Text("Impact on Targets")
                        .font(MonsTypography.sectionTitle)

                    FoodTargetImpactRow(
                        food: food,
                        quantityGrams: quantityGrams,
                        targets: targets
                    )
                }

                Divider()

                VStack(alignment: .leading, spacing: 14) {
                    Text("Nutrition per 100 g")
                        .font(MonsTypography.sectionTitle)

                    FoodNutritionDetails(food: food)
                }
            }
            .padding()
            .padding(.bottom, 12)
        }
        .background(MonsColor.background)
        .foregroundStyle(MonsColor.textPrimary)
        .navigationTitle(food.name)
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .safeAreaInset(edge: .bottom, spacing: 0) {
            FoodLogControls(
                quantityGrams: $quantityGrams,
                isSaving: isSaving,
                onAdd: save
            )
        }
    }

    private func save() {
        guard quantityGrams > 0 else { return }
        isSaving = true
        Task {
            let saved = await store.log(
                food: food,
                quantityGrams: quantityGrams,
                category: category,
                loggedAt: loggedAt
            )
            isSaving = false
            if saved {
                onLogged()
                dismiss()
            }
        }
    }
}
