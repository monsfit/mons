import Foundation

nonisolated struct MealLogItemInput: Encodable, Sendable {
    let datasetKind: DatasetKind
    let entryId: UUID
    let foodId: String
    let quantityGrams: Double

    init(item: PendingFoodLogItem) {
        datasetKind = item.food.datasetKind
        entryId = item.entryId
        foodId = item.food.foodId
        quantityGrams = item.quantityGrams
    }
}
