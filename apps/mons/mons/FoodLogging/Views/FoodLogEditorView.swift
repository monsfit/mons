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
            LazyVStack(alignment: .leading, spacing: MonsSpacing.xLarge) {
                FoodNutritionSummary(food: food, quantityGrams: quantityGrams)

                sourceSummary

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

    private var sourceSummary: some View {
        HStack(spacing: 8) {
            Image(systemName: food.datasetKind == .raw ? "fork.knife" : "shippingbox.fill")
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 2) {
                if let brand = food.brand, !brand.isEmpty {
                    Text(brand)
                        .font(MonsTypography.headline)
                }
                Text(food.datasetKind.title)
                    .font(MonsTypography.caption)
                    .foregroundStyle(MonsColor.textSecondary)
            }

            Spacer()
        }
        .padding(12)
        .background(MonsColor.surface, in: .rect(cornerRadius: MonsRadius.medium))
        .overlay {
            RoundedRectangle(cornerRadius: MonsRadius.medium)
                .stroke(MonsColor.border, lineWidth: 1)
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
