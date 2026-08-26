import Foundation

nonisolated enum FoodNutrientGroup: String, CaseIterable, Identifiable, Sendable {
    case carbohydrates
    case fats
    case protein
    case vitamins
    case minerals
    case other

    var id: Self { self }

    var title: String {
        switch self {
        case .carbohydrates:
            "Carbohydrate Breakdown"
        case .fats:
            "Fat Breakdown"
        case .protein:
            "Protein & Amino Acids"
        case .vitamins:
            "Vitamins"
        case .minerals:
            "Minerals"
        case .other:
            "Other"
        }
    }
}
