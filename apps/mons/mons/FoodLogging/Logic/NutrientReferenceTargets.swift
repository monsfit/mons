import Foundation

nonisolated struct NutrientReferenceTargets: Sendable {
    private let nutritionTargets: NutritionTargets

    init(nutritionTargets: NutritionTargets) {
        self.nutritionTargets = nutritionTargets
    }

    func target(for nutrient: FoodNutrient) -> NutrientTarget? {
        let target = personalizedTarget(for: nutrient) ?? Self.dailyValues[nutrient.field]
        guard target?.unit == nutrient.unit else { return nil }
        return target
    }

    private func personalizedTarget(for nutrient: FoodNutrient) -> NutrientTarget? {
        switch nutrient.field {
        case "calories":
            NutrientTarget(amount: Double(nutritionTargets.calories), unit: "kcal")
        case "protein":
            NutrientTarget(amount: Double(nutritionTargets.protein), unit: "g")
        case "total_fat":
            NutrientTarget(amount: Double(nutritionTargets.fat), unit: "g")
        case "carbohydrates_total":
            NutrientTarget(amount: Double(nutritionTargets.carbohydrates), unit: "g")
        default:
            nil
        }
    }

    // FDA Daily Values for adults and children age four and older. These are
    // nutrition-label reference values, not personalized clinical recommendations.
    private static let dailyValues: [String: NutrientTarget] = [
        "added_sugars": NutrientTarget(amount: 50, unit: "g"),
        "calcium": NutrientTarget(amount: 1_300, unit: "mg"),
        "choline": NutrientTarget(amount: 550, unit: "mg"),
        "dietary_cholesterol": NutrientTarget(amount: 300, unit: "mg"),
        "fiber": NutrientTarget(amount: 28, unit: "g"),
        "folate_dfe": NutrientTarget(amount: 400, unit: "mcg"),
        "iron": NutrientTarget(amount: 18, unit: "mg"),
        "magnesium": NutrientTarget(amount: 420, unit: "mg"),
        "manganese": NutrientTarget(amount: 2.3, unit: "mg"),
        "phosphorus": NutrientTarget(amount: 1_250, unit: "mg"),
        "potassium": NutrientTarget(amount: 4_700, unit: "mg"),
        "saturated_fat": NutrientTarget(amount: 20, unit: "g"),
        "selenium": NutrientTarget(amount: 55, unit: "mcg"),
        "sodium": NutrientTarget(amount: 2_300, unit: "mg"),
        "vitamin_b1_thiamin": NutrientTarget(amount: 1.2, unit: "mg"),
        "vitamin_b2_riboflavin": NutrientTarget(amount: 1.3, unit: "mg"),
        "vitamin_b3_niacin": NutrientTarget(amount: 16, unit: "mg"),
        "vitamin_b5_pantothenic_acid": NutrientTarget(amount: 5, unit: "mg"),
        "vitamin_b6": NutrientTarget(amount: 1.7, unit: "mg"),
        "vitamin_b12_cobalamin": NutrientTarget(amount: 2.4, unit: "mcg"),
        "vitamin_c_ascorbic_acid": NutrientTarget(amount: 90, unit: "mg"),
        "vitamin_d_calciferol": NutrientTarget(amount: 20, unit: "mcg"),
        "vitamin_e_tocopherol": NutrientTarget(amount: 15, unit: "mg"),
        "vitamin_k_phylloquinone": NutrientTarget(amount: 120, unit: "mcg"),
        "zinc": NutrientTarget(amount: 11, unit: "mg"),
    ]
}
