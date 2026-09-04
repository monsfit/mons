import Foundation

nonisolated struct CatalogFood: Codable, Hashable, Identifiable, Sendable {
    let brand: String?
    let calories: Double?
    let carbohydrates: Double?
    let datasetKind: DatasetKind
    let foodId: String
    let gtin: String?
    let name: String
    let nutrientBasis: NutrientBasis
    let nutrients: [FoodNutrient]
    let portions: [FoodPortion]
    let protein: Double?
    let source: String
    let sourceId: String
    let totalFat: Double?

    var id: String { "\(datasetKind.rawValue)-\(foodId)" }

    init(
        brand: String?,
        calories: Double?,
        carbohydrates: Double?,
        datasetKind: DatasetKind,
        foodId: String,
        gtin: String?,
        name: String,
        nutrientBasis: NutrientBasis = .standardHundredGrams,
        nutrients: [FoodNutrient],
        portions: [FoodPortion],
        protein: Double?,
        source: String,
        sourceId: String,
        totalFat: Double?
    ) {
        self.brand = brand
        self.calories = calories
        self.carbohydrates = carbohydrates
        self.datasetKind = datasetKind
        self.foodId = foodId
        self.gtin = gtin
        self.name = name
        self.nutrientBasis = nutrientBasis
        self.nutrients = nutrients
        self.portions = portions
        self.protein = protein
        self.source = source
        self.sourceId = sourceId
        self.totalFat = totalFat
    }

    var gramPortions: [FoodPortion] {
        portions.filter { $0.gramAmount != nil }
    }

    var availableNutrients: [FoodNutrient] {
        guard nutrients.isEmpty else { return nutrients }
        return [
            fallbackNutrient(field: "calories", name: "Calories", unit: "kcal", amount: calories),
            fallbackNutrient(field: "protein", name: "Protein", unit: "g", amount: protein),
            fallbackNutrient(
                field: "carbohydrates_total",
                name: "Total Carbohydrates",
                unit: "g",
                amount: carbohydrates
            ),
            fallbackNutrient(field: "total_fat", name: "Total Fat", unit: "g", amount: totalFat),
        ].compactMap { $0 }
    }

    func quantityGrams(amount: Double, portion: FoodPortion?) -> Double {
        max(amount, 0) * (portion?.gramAmount ?? 1)
    }

    func scaled(_ nutrient: Double?, quantityGrams: Double) -> Double {
        guard let nutrient else { return 0 }
        return nutrient * max(quantityGrams, 0) / nutrientBasis.amount
    }

    private func fallbackNutrient(
        field: String,
        name: String,
        unit: String,
        amount: Double?
    ) -> FoodNutrient? {
        guard let amount else { return nil }
        return FoodNutrient(amount: amount, field: field, name: name, unit: unit)
    }
}
