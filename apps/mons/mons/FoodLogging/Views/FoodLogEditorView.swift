import SwiftUI

struct FoodLogEditorView: View {
    let food: CatalogFood
    let onLogged: () -> Void

    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

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
            LazyVStack(alignment: .leading, spacing: 24) {
                FoodNutritionSummary(food: food, quantityGrams: quantityGrams)

                sourceSummary

                FoodLogMetadataControls(
                    category: $category,
                    loggedAt: $loggedAt
                )

                Divider()

                VStack(alignment: .leading, spacing: 16) {
                    Text("Impact on Targets")
                        .font(.title3.weight(.semibold))

                    FoodTargetImpactRow(
                        food: food,
                        quantityGrams: quantityGrams,
                        targets: targets
                    )
                }

                Divider()

                VStack(alignment: .leading, spacing: 14) {
                    Text("Nutrition per 100 g")
                        .font(.title3.weight(.semibold))

                    FoodNutritionDetails(food: food)
                }
            }
            .padding()
            .padding(.bottom, 12)
        }
        .background(Color.secondary.opacity(0.05))
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

    private var sourceSummary: some View {
        HStack(spacing: 8) {
            Image(systemName: food.datasetKind == .raw ? "fork.knife" : "shippingbox.fill")
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 2) {
                if let brand = food.brand, !brand.isEmpty {
                    Text(brand)
                        .font(.subheadline.weight(.medium))
                }
                Text(food.datasetKind.title)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding(12)
        .background(.background, in: .rect(cornerRadius: 14))
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
