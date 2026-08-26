import Foundation

nonisolated enum FoodNutrientPresentation {
    static func nutrients(_ nutrients: [FoodNutrient], in group: FoodNutrientGroup) -> [FoodNutrient] {
        let grouped = nutrients.filter { $0.group == group && $0.amount.isFinite && $0.amount >= 0 }
        guard group == .fats else { return grouped }

        var result = Self.fields.compactMap { field in
            grouped.first { $0.field == field && ($0.amount > 0 || field == "total_fat") }
        }

        if let omega3 = preferredNutrient(
            in: grouped,
            fields: ["omega_3_total_reported", "omega_3_ala_epa_dha_sum"]
        ) {
            result.append(omega3)
        }

        if let omega6 = preferredNutrient(
            in: grouped,
            fields: ["omega_6_total_reported", "omega_6_linoleic_acid"]
        ) {
            result.append(omega6)
        }

        return result
    }

    private static func preferredNutrient(
        in nutrients: [FoodNutrient],
        fields: [String]
    ) -> FoodNutrient? {
        fields.lazy.compactMap { field in
            nutrients.first { $0.field == field && $0.amount > 0 }
        }.first
    }

    private static let fields = [
        "total_fat",
        "saturated_fat",
        "monounsaturated_fat",
        "polyunsaturated_fat",
        "trans_fat",
    ]
}
