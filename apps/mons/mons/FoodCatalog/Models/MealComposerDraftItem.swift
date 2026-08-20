#if DEBUG && os(iOS)
import Foundation

struct MealComposerDraftItem: Equatable, Identifiable {
    enum Kind: Equatable {
        case food
        case image
    }

    enum Palette: Equatable {
        case berry
        case grain
        case green
        case orange
        case photo
    }

    var id: String
    var title: String
    var detail: String
    var kind: Kind
    var servings: Double
    var unit: String
    var caloriesPerServing: Int
    var systemImage: String
    var palette: Palette
    var imageData: Data? = nil
    var pendingFood: PendingFoodLogItem? = nil

    var calories: Int {
        if let pendingFood {
            return Int(
                pendingFood.food.scaled(
                    pendingFood.food.calories,
                    quantityGrams: pendingFood.quantityGrams
                ).rounded()
            )
        }
        return Int((Double(caloriesPerServing) * servings).rounded())
    }

    static func food(_ pendingFood: PendingFoodLogItem) -> MealComposerDraftItem {
        let food = pendingFood.food
        let brand = food.brand?.trimmingCharacters(in: .whitespacesAndNewlines)
        let detail = [
            brand?.isEmpty == false ? brand : nil,
            "\(pendingFood.quantityGrams.formatted(.number.precision(.fractionLength(0...1)))) g",
        ]
        .compactMap { $0 }
        .joined(separator: " · ")

        return MealComposerDraftItem(
            id: pendingFood.entryId.uuidString,
            title: food.name,
            detail: detail,
            kind: .food,
            servings: pendingFood.quantityGrams,
            unit: "g",
            caloriesPerServing: 0,
            systemImage: food.datasetKind == .branded ? "takeoutbag.and.cup.and.straw.fill" : "fork.knife",
            palette: palette(for: food),
            pendingFood: pendingFood
        )
    }

    private static func palette(for food: CatalogFood) -> Palette {
        switch food.datasetKind {
        case .branded: .berry
        case .custom: .orange
        case .raw: .green
        case .recipe: .grain
        }
    }
}
#endif
