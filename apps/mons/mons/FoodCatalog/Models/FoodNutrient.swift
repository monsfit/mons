import Foundation

nonisolated struct FoodNutrient: Codable, Hashable, Identifiable, Sendable {
    let amount: Double
    let field: String
    let name: String
    let unit: String

    var id: String { field }

    var displayName: String {
        switch field {
        case "calories": "Calories"
        case "carbohydrates_total": "Total Carbohydrates"
        case "carbohydrates_available": "Available Carbohydrates"
        case "carbohydrates_net_calculated": "Net Carbohydrates"
        case "fiber": "Fiber"
        case "total_sugars": "Sugars"
        case "added_sugars": "Added Sugars"
        case "total_fat": "Total Fat"
        case "monounsaturated_fat": "Monounsaturated Fat"
        case "polyunsaturated_fat": "Polyunsaturated Fat"
        case "saturated_fat": "Saturated Fat"
        case "trans_fat": "Trans Fat"
        case "omega_3_total_reported", "omega_3_ala_epa_dha_sum": "Omega-3 Fat"
        case "omega_6_total_reported", "omega_6_linoleic_acid": "Omega-6 Fat"
        case "dietary_cholesterol": "Cholesterol"
        default: name
        }
    }

    var group: FoodNutrientGroup {
        if Self.carbohydrateFields.contains(field) {
            return .carbohydrates
        }
        if Self.fatFields.contains(field) || field.hasPrefix("omega_") {
            return .fats
        }
        if field == "protein" || Self.aminoAcidFields.contains(field) {
            return .protein
        }
        if field.hasPrefix("vitamin_") || field.hasPrefix("folate_") {
            return .vitamins
        }
        if Self.mineralFields.contains(field) {
            return .minerals
        }
        return .other
    }

    private static let carbohydrateFields: Set<String> = [
        "carbohydrates_total",
        "carbohydrates_available",
        "carbohydrates_net_calculated",
        "fiber",
        "starch",
        "total_sugars",
        "added_sugars",
    ]

    private static let fatFields: Set<String> = [
        "total_fat",
        "monounsaturated_fat",
        "polyunsaturated_fat",
        "saturated_fat",
        "trans_fat",
    ]

    private static let aminoAcidFields: Set<String> = [
        "cysteine",
        "histidine",
        "isoleucine",
        "leucine",
        "lysine",
        "methionine",
        "phenylalanine",
        "threonine",
        "tryptophan",
        "tyrosine",
        "valine",
    ]

    private static let mineralFields: Set<String> = [
        "calcium",
        "copper",
        "iron",
        "manganese",
        "magnesium",
        "phosphorus",
        "potassium",
        "selenium",
        "sodium",
        "zinc",
    ]
}
