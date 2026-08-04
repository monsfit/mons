import SwiftUI

struct FoodLogEditorView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    let food: CatalogFood
    let pendingItemCount: Int
    let onAdd: (PendingFoodLogItem) -> Void
    let onLog: (PendingFoodLogItem) async -> Bool

    @State private var amount = 100.0
    @State private var entryId = UUID()
    @State private var isSaving = false
    @State private var loggedAt: Date
    @State private var selectedPortion: FoodPortion?

    private var targets: NutritionTargets {
        NutritionTargets(calorieGoal: store.calorieGoal)
    }

    private var quantityGrams: Double {
        food.quantityGrams(amount: amount, portion: selectedPortion)
    }

    init(
        food: CatalogFood,
        loggedAt: Date,
        pendingItemCount: Int,
        onAdd: @escaping (PendingFoodLogItem) -> Void,
        onLog: @escaping (PendingFoodLogItem) async -> Bool
    ) {
        self.food = food
        self.pendingItemCount = pendingItemCount
        self.onAdd = onAdd
        self.onLog = onLog
        _loggedAt = State(initialValue: loggedAt)
    }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: MonsSpacing.xLarge) {
                FoodNutritionSummary(food: food, quantityGrams: quantityGrams)

                FoodSourceSummary(food: food)

                FoodLogMetadataControls(loggedAt: $loggedAt)

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
                amount: $amount,
                selectedPortion: $selectedPortion,
                portions: food.gramPortions,
                isSaving: isSaving,
                pendingItemCount: pendingItemCount,
                onAdd: add,
                onLog: log
            )
        }
    }

    private var pendingItem: PendingFoodLogItem? {
        guard amount > 0, quantityGrams > 0 else { return nil }
        return PendingFoodLogItem(
            entryId: entryId,
            food: food,
            loggedAt: loggedAt,
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
            _ = await onLog(pendingItem)
            isSaving = false
        }
    }
}
