import Foundation

nonisolated enum RecentFoodBuilder {
    static func foods(
        pendingItems: [PendingFoodLogItem],
        entries: [FoodLogEntry],
        limit: Int = 8
    ) -> [CatalogFood] {
        guard limit > 0 else { return [] }

        let pendingFoods = pendingItems.reversed().map(\.food)
        let loggedFoods = entries
            .sorted {
                if $0.loggedAt == $1.loggedAt {
                    return $0.entryId.uuidString < $1.entryId.uuidString
                }
                return $0.loggedAt > $1.loggedAt
            }
            .map(catalogFood)

        var seen = Set<String>()
        return (pendingFoods + loggedFoods).compactMap { food in
            guard seen.insert(food.id).inserted else { return nil }
            return food
        }
        .prefix(limit)
        .map { $0 }
    }

    private static func catalogFood(from entry: FoodLogEntry) -> CatalogFood {
        let calories = perHundred(entry.calories, quantityGrams: entry.quantityGrams)
        let carbohydrates = perHundred(entry.carbohydrates, quantityGrams: entry.quantityGrams)
        let protein = perHundred(entry.protein, quantityGrams: entry.quantityGrams)
        let totalFat = perHundred(entry.fat, quantityGrams: entry.quantityGrams)

        return CatalogFood(
            brand: entry.brand,
            calories: calories,
            carbohydrates: carbohydrates,
            datasetKind: entry.datasetKind,
            foodId: entry.foodId,
            gtin: entry.gtin,
            name: entry.name,
            nutrients: [
                nutrient(field: "calories", name: "Calories", unit: "kcal", amount: calories),
                nutrient(field: "protein", name: "Protein", unit: "g", amount: protein),
                nutrient(
                    field: "carbohydrates_total",
                    name: "Total Carbohydrates",
                    unit: "g",
                    amount: carbohydrates
                ),
                nutrient(field: "total_fat", name: "Total Fat", unit: "g", amount: totalFat),
            ].compactMap { $0 },
            portions: [],
            protein: protein,
            source: "recent_food_log",
            sourceId: entry.foodId,
            totalFat: totalFat
        )
    }

    private static func perHundred(_ value: Double?, quantityGrams: Double) -> Double? {
        guard let value, quantityGrams > 0 else { return nil }
        return value * 100 / quantityGrams
    }

    private static func nutrient(
        field: String,
        name: String,
        unit: String,
        amount: Double?
    ) -> FoodNutrient? {
        guard let amount else { return nil }
        return FoodNutrient(amount: amount, field: field, name: name, unit: unit)
    }
}
