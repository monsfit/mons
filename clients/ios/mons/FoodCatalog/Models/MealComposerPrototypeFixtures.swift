#if DEBUG && os(iOS)
import Foundation

enum MealComposerPrototypeFixtures {
    static let loggedAt = Date(timeIntervalSince1970: 1_787_151_600)

    static let catalogFoods = [
        CatalogFood(
            brand: "Fage",
            calories: 59,
            carbohydrates: 3.6,
            datasetKind: .branded,
            foodId: "fixture-greek-yogurt",
            gtin: "00012345678905",
            name: "Greek Yogurt, Plain Nonfat",
            nutrients: [],
            portions: [FoodPortion(amount: 170, name: "1 container", unit: .grams)],
            protein: 10.3,
            source: "usda_branded",
            sourceId: "fixture-greek-yogurt",
            totalFat: 0.4
        ),
        CatalogFood(
            brand: nil,
            calories: 173,
            carbohydrates: 20,
            datasetKind: .recipe,
            foodId: "fixture-chicken-rice-bowl",
            gtin: nil,
            name: "Chicken Rice Bowl",
            nutrients: [],
            portions: [FoodPortion(amount: 300, name: "1 bowl", unit: .grams)],
            protein: 14,
            source: "mons_recipe",
            sourceId: "fixture-chicken-rice-bowl",
            totalFat: 4.8
        ),
        CatalogFood(
            brand: nil,
            calories: 196,
            carbohydrates: 24,
            datasetKind: .raw,
            foodId: "fixture-avocado-toast",
            gtin: nil,
            name: "Avocado Toast",
            nutrients: [],
            portions: [FoodPortion(amount: 125, name: "1 slice", unit: .grams)],
            protein: 6,
            source: "usda_foundation",
            sourceId: "fixture-avocado-toast",
            totalFat: 12
        ),
        CatalogFood(
            brand: nil,
            calories: 206,
            carbohydrates: 0,
            datasetKind: .raw,
            foodId: "fixture-atlantic-salmon",
            gtin: nil,
            name: "Atlantic Salmon, Cooked",
            nutrients: [],
            portions: [FoodPortion(amount: 113, name: "4 oz portion", unit: .grams)],
            protein: 22,
            source: "usda_foundation",
            sourceId: "fixture-atlantic-salmon",
            totalFat: 12
        ),
        CatalogFood(
            brand: nil,
            calories: 89,
            carbohydrates: 23,
            datasetKind: .raw,
            foodId: "fixture-banana",
            gtin: nil,
            name: "Banana, Raw",
            nutrients: [],
            portions: [FoodPortion(amount: 118, name: "1 medium banana", unit: .grams)],
            protein: 1.1,
            source: "usda_foundation",
            sourceId: "fixture-banana",
            totalFat: 0.3
        ),
        CatalogFood(
            brand: "My Kitchen",
            calories: 156,
            carbohydrates: 18,
            datasetKind: .custom,
            foodId: "fixture-protein-oats",
            gtin: nil,
            name: "Protein Oats",
            nutrients: [],
            portions: [FoodPortion(amount: 240, name: "1 bowl", unit: .grams)],
            protein: 12,
            source: "user",
            sourceId: "fixture-protein-oats",
            totalFat: 4.5
        ),
    ]

    static let searchFoods = catalogFoods.enumerated().map { index, food in
        MealComposerDraftItem.food(
            PendingFoodLogItem(
                entryId: deterministicEntryIDs[index],
                food: food,
                loggedAt: loggedAt,
                quantityGrams: food.gramPortions.first?.gramAmount ?? 100
            )
        )
    }

    static let images = [
        MealComposerDraftItem(
            id: "meal-photo-1",
            title: "Meal photo",
            detail: "Camera",
            kind: .image,
            servings: 1,
            unit: "photo",
            caloriesPerServing: 0,
            systemImage: "photo.fill",
            palette: .photo
        ),
        MealComposerDraftItem(
            id: "meal-photo-2",
            title: "Side dish photo",
            detail: "Photo library",
            kind: .image,
            servings: 1,
            unit: "photo",
            caloriesPerServing: 0,
            systemImage: "photo.on.rectangle.angled",
            palette: .green
        ),
    ]

    static var threeItemDraft: MealComposerDraft {
        MealComposerDraft(
            context: "Lunch after the gym",
            items: [searchFoods[1], images[0], searchFoods[2]]
        )
    }

    static var overflowDraft: MealComposerDraft {
        MealComposerDraft(
            context: "Lunch after the gym",
            items: [searchFoods[1], images[0], searchFoods[2], images[1], searchFoods[4]]
        )
    }

    static func scannedFood(gtin: String) -> CatalogFood {
        let fixture = catalogFoods[0]
        return CatalogFood(
            brand: fixture.brand,
            calories: fixture.calories,
            carbohydrates: fixture.carbohydrates,
            datasetKind: fixture.datasetKind,
            foodId: "fixture-barcode-\(gtin)",
            gtin: gtin,
            name: fixture.name,
            nutrients: fixture.nutrients,
            portions: fixture.portions,
            protein: fixture.protein,
            source: fixture.source,
            sourceId: "fixture-barcode-\(gtin)",
            totalFat: fixture.totalFat
        )
    }

    private static let deterministicEntryIDs = [
        UUID(uuidString: "00000000-0000-4000-8000-000000000101")!,
        UUID(uuidString: "00000000-0000-4000-8000-000000000102")!,
        UUID(uuidString: "00000000-0000-4000-8000-000000000103")!,
        UUID(uuidString: "00000000-0000-4000-8000-000000000104")!,
        UUID(uuidString: "00000000-0000-4000-8000-000000000105")!,
        UUID(uuidString: "00000000-0000-4000-8000-000000000106")!,
    ]
}
#endif
