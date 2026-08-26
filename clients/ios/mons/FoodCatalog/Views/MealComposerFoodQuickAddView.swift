#if DEBUG && os(iOS)
import SwiftUI

struct MealComposerFoodQuickAddView: View {
    let onAdd: (CatalogFood) -> Void

    @State private var barcode: String
    @State private var calories = 0.0
    @State private var carbohydrates = 0.0
    @State private var foodName = ""
    @State private var protein = 0.0
    @State private var totalFat = 0.0

    private var canAdd: Bool {
        !foodName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    init(barcode: String, onAdd: @escaping (CatalogFood) -> Void) {
        self.onAdd = onAdd
        _barcode = State(initialValue: barcode)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: MonsSpacing.large) {
                Text("Quick Add")
                    .font(.title2.bold())

                Text("Add the nutrition you already know. You can edit serving details later.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                TextField("Food name", text: $foodName)
                    .textInputAutocapitalization(.words)
                    .padding(.horizontal, MonsSpacing.medium)
                    .frame(minHeight: 44)
                    .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 18))

                TextField("Barcode (optional)", text: $barcode)
                    .keyboardType(.numberPad)
                    .padding(.horizontal, MonsSpacing.medium)
                    .frame(minHeight: 44)
                    .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 18))

                Text("Nutrition per 100 g")
                    .font(.headline)

                LazyVGrid(
                    columns: [
                        GridItem(.flexible(), spacing: MonsSpacing.medium),
                        GridItem(.flexible()),
                    ],
                    spacing: MonsSpacing.medium
                ) {
                    MealComposerQuickAddNutritionField(
                        title: "Calories",
                        unit: "cal",
                        value: $calories
                    )
                    MealComposerQuickAddNutritionField(
                        title: "Protein",
                        unit: "g",
                        value: $protein
                    )
                    MealComposerQuickAddNutritionField(
                        title: "Carbs",
                        unit: "g",
                        value: $carbohydrates
                    )
                    MealComposerQuickAddNutritionField(
                        title: "Fat",
                        unit: "g",
                        value: $totalFat
                    )
                }
            }
            .padding(MonsSpacing.xLarge)
        }
        .scrollDismissesKeyboard(.interactively)
        .safeAreaInset(edge: .bottom) {
            Button("Add to Meal", systemImage: "plus", action: addFood)
                .buttonStyle(.glassProminent)
                .disabled(!canAdd)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, MonsSpacing.xLarge)
                .padding(.vertical, MonsSpacing.small)
        }
    }

    private func addFood() {
        guard canAdd else { return }
        let food = CatalogFood(
            brand: nil,
            calories: calories,
            carbohydrates: carbohydrates,
            datasetKind: .custom,
            foodId: "quick-add-\(UUID().uuidString)",
            gtin: BarcodeNormalizer.gtin14(barcode),
            name: foodName.trimmingCharacters(in: .whitespacesAndNewlines),
            nutrients: [],
            portions: [FoodPortion(amount: 100, name: "100 g", unit: .grams)],
            protein: protein,
            source: "user",
            sourceId: "quick-add",
            totalFat: totalFat
        )
        onAdd(food)
        foodName = ""
        calories = 0
        carbohydrates = 0
        protein = 0
        totalFat = 0
    }
}
#endif
